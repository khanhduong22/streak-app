import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, streaks, checkIns } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Refresh a Google OAuth token using the refresh_token */
async function refreshFitToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

/** Query Google Fit for today's aggregate data */
async function getTodayFitData(accessToken: string) {
  // Google Fit uses millisecond timestamps
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMs = startOfDay.getTime();
  const endMs = now.getTime();

  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.active_minutes" },
    ],
    bucketByTime: { durationMillis: endMs - startMs },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };

  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Fit API error: ${res.status}`);
  }

  const data = await res.json();

  let totalSteps = 0;
  let totalActiveMinutes = 0;

  for (const bucket of data.bucket || []) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        if (dataset.dataSourceId?.includes("step_count")) {
          totalSteps += point.value?.[0]?.intVal || 0;
        }
        if (dataset.dataSourceId?.includes("active_minutes")) {
          totalActiveMinutes += point.value?.[0]?.intVal || 0;
        }
      }
    }
  }

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

  // Get all users with Google Fit connected
  const fitUsers = await db.query.users.findMany({
    where: isNotNull(users.fitAccessToken),
  });

  for (const user of fitUsers) {
    try {
      let accessToken = user.fitAccessToken!;

      // Refresh token if expired (or expiring within 5 min)
      const expiresAt = user.fitTokenExpiry;
      const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

      if (needsRefresh && user.fitRefreshToken) {
        const newTokens = await refreshFitToken(user.fitRefreshToken);
        if (newTokens.access_token) {
          accessToken = newTokens.access_token;
          await db.update(users).set({
            fitAccessToken: newTokens.access_token,
            fitTokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000),
          }).where(eq(users.id, user.id));
        }
      }

      // Fetch Fit data
      const { totalSteps, totalActiveMinutes } = await getTodayFitData(accessToken);

      // Get streaks with auto-checkin enabled for this user
      const autoStreaks = await db.query.streaks.findMany({
        where: and(
          eq(streaks.userId, user.id),
          eq(streaks.autoCheckinSource, "google_fit")
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

        // Check thresholds: OR logic (either steps OR active minutes)
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
              note: `🤖 Auto via Google Fit (${totalSteps} steps, ${totalActiveMinutes} min active)`,
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

            // Give coins (full tier = 30)
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
