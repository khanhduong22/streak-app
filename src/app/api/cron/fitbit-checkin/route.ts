import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, streaks, checkIns } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Refresh a Fitbit OAuth token using the refresh_token */
async function refreshFitbitToken(refreshToken: string) {
  const clientId = process.env.FITBIT_CLIENT_ID!;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET!;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Fitbit Token Refresh Error: ${res.status}`);
  }
  return res.json();
}

/** Query Fitbit for today's summary data (steps, active minutes) */
async function getTodayFitbitData(accessToken: string, userId: string) {
  // Fitbit uses YYYY-MM-DD for dates
  const today = new Date().toISOString().split("T")[0];

  const res = await fetch(
    `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Fitbit API error: ${res.status}`);
  }

  const data = await res.json();
  const summary = data.summary;

  const totalSteps = summary?.steps || 0;
  // Fitbit splits active minutes into 3 categories: lightly, fairly, very
  const totalActiveMinutes =
    (summary?.lightlyActiveMinutes || 0) +
    (summary?.fairlyActiveMinutes || 0) +
    (summary?.veryActiveMinutes || 0);

  return { totalSteps, totalActiveMinutes };
}

export async function POST(req: NextRequest) {
  // Security check
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const results: { userId: string; streakId: string; action: string }[] = [];

  // Get all users with Fitbit connected
  const fitbitUsers = await db.query.users.findMany({
    where: isNotNull(users.fitbitAccessToken),
  });

  for (const user of fitbitUsers) {
    try {
      let accessToken = user.fitbitAccessToken!;

      // Refresh token if expired (or expiring within 5 min)
      const expiresAt = user.fitbitTokenExpiry;
      const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

      if (needsRefresh && user.fitbitRefreshToken) {
        const newTokens = await refreshFitbitToken(user.fitbitRefreshToken);
        if (newTokens.access_token) {
          accessToken = newTokens.access_token;
          await db.update(users).set({
            fitbitAccessToken: newTokens.access_token,
            fitbitRefreshToken: newTokens.refresh_token,
            fitbitTokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000),
          }).where(eq(users.id, user.id));
        }
      }

      // Fetch Fitbit data
      const { totalSteps, totalActiveMinutes } = await getTodayFitbitData(accessToken, user.id);

      // Get streaks with auto-checkin enabled for this user
      const autoStreaks = await db.query.streaks.findMany({
        where: and(
          eq(streaks.userId, user.id),
          eq(streaks.autoCheckinSource, "fitbit")
        ),
      });

      for (const streak of autoStreaks) {
        // Check if already checked in today
        const existing = await db.query.checkIns.findFirst({
          where: and(
            eq(checkIns.streakId, streak.id),
            eq(checkIns.userId, user.id),
            eq(checkIns.checkInDate, today)
          ),
        });

        if (existing) {
          results.push({ userId: user.id, streakId: streak.id, action: "already_checked_in" });
          continue;
        }

        // Check thresholds: OR logic
        const stepsOk = totalSteps >= streak.autoCheckinMinSteps;
        const minutesOk = totalActiveMinutes >= streak.autoCheckinMinMinutes;

        if (stepsOk || minutesOk) {
          // Auto check-in!
          await db.transaction(async (tx) => {
            await tx.insert(checkIns).values({
              streakId: streak.id,
              userId: user.id,
              checkInDate: today,
              status: "checked_in",
              tier: "full",
              note: `⌚ Auto via Fitbit (${totalSteps} steps, ${totalActiveMinutes} min active)`,
            });

            // Increment streak
            const newStreak = streak.lastCheckIn === new Date(Date.now() - 86400000).toISOString().split("T")[0]
              ? streak.currentStreak + 1
              : 1;
            const newLongest = Math.max(streak.longestStreak, newStreak);

            await tx.update(streaks).set({
              currentStreak: newStreak,
              longestStreak: newLongest,
              lastCheckIn: today,
              updatedAt: new Date(),
            }).where(eq(streaks.id, streak.id));

            // Give coins
            await tx.update(users).set({ coins: user.coins + 30 }).where(eq(users.id, user.id));
          });

          results.push({ userId: user.id, streakId: streak.id, action: `auto_checked_in (${totalSteps} steps, ${totalActiveMinutes} min)` });
        } else {
          results.push({ userId: user.id, streakId: streak.id, action: `skipped (${totalSteps}/${streak.autoCheckinMinSteps} steps, ${totalActiveMinutes}/${streak.autoCheckinMinMinutes} min)` });
        }
      }
    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err);
      results.push({ userId: user.id, streakId: "N/A", action: `error: ${(err as Error).message}` });
    }
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ date: today, processed: results.length, results });
}
