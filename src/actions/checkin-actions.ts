"use server";

import { db } from "@/db";
import { checkIns, streaks, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { forfeitStake } from "./stake-actions";

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getDaysBetween(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function checkIn(
  streakId: string,
  note?: string,
  mood?: "happy" | "tired" | "stressed" | null,
  tier: "full" | "half" | "minimal" = "full",
  photoUrl?: string | null
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const today = getTodayString();

  // Check if already checked in today
  const existing = await db.query.checkIns.findFirst({
    where: and(
      eq(checkIns.streakId, streakId),
      eq(checkIns.userId, userId),
      eq(checkIns.checkInDate, today)
    ),
  });

  if (existing) {
    throw new Error("Already checked in today");
  }

  // Get user info (for coins & freezes)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new Error("User not found");

  // Get the streak
  const streak = await db.query.streaks.findFirst({
    where: and(eq(streaks.id, streakId), eq(streaks.userId, userId)),
  });

  if (!streak) throw new Error("Streak not found");

  const yesterday = getYesterdayString();
  let newCurrentStreak = 1;
  let freezesToUse = 0;
  const newCheckInsToInsert: {
    streakId: string;
    userId: string;
    checkInDate: string;
    status: "checked_in" | "frozen";
    tier: "full" | "half" | "minimal";
    mood?: "happy" | "tired" | "stressed" | null;
    note?: string | null;
    photoUrl?: string | null;
  }[] = [
      {
        streakId,
        userId,
        checkInDate: today,
        status: "checked_in",
        tier,
        mood: mood || null,
        note: note || null,
        photoUrl: photoUrl || null,
      },
    ];

  // Coin reward mapping
  const coinsReward = tier === "full" ? 30 : tier === "half" ? 20 : 10;

  // Logic 1: Checked in yesterday or today? -> Normal streak++
  if (streak.lastCheckIn === yesterday || streak.lastCheckIn === today) {
    newCurrentStreak = streak.currentStreak + 1;
  }
  // Logic 2: First time check-in ever? -> Streak = 1
  else if (!streak.lastCheckIn) {
    newCurrentStreak = 1;
  }
  // Logic 3: Missed some days. Try to use Auto-Freezes!
  else {
    const missedDays = getDaysBetween(streak.lastCheckIn, today) - 1; // if last checkin was 2 days ago, missed = 1

    // Do they have enough freezes?
    if (user.freezeTokens >= missedDays) {
      // ✅ Use freezes! 
      freezesToUse = missedDays;
      newCurrentStreak = streak.currentStreak + missedDays + 1; // Keep old streak + freezes + today

      // Insert fake frozen days
      for (let i = 1; i <= missedDays; i++) {
        const d = new Date(streak.lastCheckIn);
        d.setDate(d.getDate() + i);
        newCheckInsToInsert.push({
          streakId,
          userId,
          checkInDate: d.toISOString().split("T")[0],
          status: "frozen",
          tier: "full",
        });
      }
    } else {
      // ❌ Not enough freezes. Streak broken. Reset to 1.
      newCurrentStreak = 1;
      // Forfeit any active stake since the streak just broke
      await forfeitStake(streakId, userId);
    }
  }

  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  // Database Execution (Transaction)
  await db.transaction(async (tx) => {
    // 1. Insert check-ins (today + any frozen days)
    await tx.insert(checkIns).values(newCheckInsToInsert);

    // 2. Update streak stats
    await tx
      .update(streaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastCheckIn: today,
        updatedAt: new Date(),
      })
      .where(eq(streaks.id, streakId));

    // 3. Update user: give coins based on tier, deduct freezes
    await tx
      .update(users)
      .set({
        coins: user.coins + coinsReward,
        freezeTokens: user.freezeTokens - freezesToUse,
      })
      .where(eq(users.id, userId));
  });

  revalidatePath("/dashboard");
  return { earnedCoins: coinsReward, freezesUsed: freezesToUse };
}

export async function undoCheckIn(streakId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const today = getTodayString();

  await db.transaction(async (tx) => {
    // 1. Check if today's checkin exists and is NOT a freeze
    const todayCheckin = await tx.query.checkIns.findFirst({
      where: and(
        eq(checkIns.streakId, streakId),
        eq(checkIns.userId, userId),
        eq(checkIns.checkInDate, today),
        eq(checkIns.status, "checked_in")
      ),
    });

    if (!todayCheckin) throw new Error("No check-in found to undo today");

    // 2. Delete today's checkin
    await tx.delete(checkIns).where(eq(checkIns.id, todayCheckin.id));

    // 3. Deduct coins (assuming they got full/half/minimal but for simplicity we can't easily query the exact reward here without refetching it)
    // Actually we CAN query it from `todayCheckin`.
    const coinsRewardToDeduct = todayCheckin.tier === "full" ? 30 : todayCheckin.tier === "half" ? 20 : 10;

    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user) {
      await tx
        .update(users)
        .set({ coins: Math.max(0, user.coins - coinsRewardToDeduct) })
        .where(eq(users.id, userId));
    }

    // 4. Important: We DO NOT refund Auto-Freezes on undo. 
    // If they used freezes to bridge a gap, undoing today's checkin just removes today.
    // The freezes remain consumed and those days remain frozen.

    // 5. Recalculate streak
    const lastCheckIn = await tx.query.checkIns.findFirst({
      where: and(eq(checkIns.streakId, streakId), eq(checkIns.userId, userId)),
      orderBy: (c, { desc }) => [desc(c.checkInDate)],
    });

    // Walk back to calculate streak length
    let currentStreak = 0;
    if (lastCheckIn) {
      const allCheckIns = await tx.query.checkIns.findMany({
        where: and(eq(checkIns.streakId, streakId), eq(checkIns.userId, userId)),
        orderBy: (c, { desc }) => [desc(c.checkInDate)],
      });

      const checkInDates = new Set(allCheckIns.map((c) => c.checkInDate));
      const d = new Date(lastCheckIn.checkInDate);
      while (checkInDates.has(d.toISOString().split("T")[0])) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }

    await tx
      .update(streaks)
      .set({
        currentStreak,
        lastCheckIn: lastCheckIn?.checkInDate || null,
        updatedAt: new Date(),
      })
      .where(eq(streaks.id, streakId));
  });

  revalidatePath("/dashboard");
}

export async function getCheckIns(streakId: string, year: number, month: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  return db.query.checkIns.findMany({
    where: and(
      eq(checkIns.streakId, streakId),
      eq(checkIns.userId, userId),
      gte(checkIns.checkInDate, startDate),
      lte(checkIns.checkInDate, endDate)
    ),
    orderBy: (c, { asc }) => [asc(c.checkInDate)],
  });
}
