"use server";

import { db } from "@/db";
import { checkIns, streaks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function checkIn(streakId: string, note?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const today = getTodayString();

  // Check if already checked in today
  const existing = await db.query.checkIns.findFirst({
    where: and(
      eq(checkIns.streakId, streakId),
      eq(checkIns.userId, session.user.id),
      eq(checkIns.checkInDate, today)
    ),
  });

  if (existing) {
    throw new Error("Already checked in today");
  }

  // Get the streak
  const streak = await db.query.streaks.findFirst({
    where: and(eq(streaks.id, streakId), eq(streaks.userId, session.user.id)),
  });

  if (!streak) throw new Error("Streak not found");

  // Calculate new streak count
  const yesterday = getYesterdayString();
  let newCurrentStreak = 1;

  if (streak.lastCheckIn === yesterday || streak.lastCheckIn === today) {
    newCurrentStreak = streak.currentStreak + 1;
  }

  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  // Insert check-in and update streak in parallel
  await Promise.all([
    db.insert(checkIns).values({
      streakId,
      userId: session.user.id,
      checkInDate: today,
      note: note || null,
    }),
    db
      .update(streaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastCheckIn: today,
        updatedAt: new Date(),
      })
      .where(eq(streaks.id, streakId)),
  ]);

  revalidatePath("/dashboard");
}

export async function undoCheckIn(streakId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const today = getTodayString();

  // Delete today's check-in
  await db
    .delete(checkIns)
    .where(
      and(
        eq(checkIns.streakId, streakId),
        eq(checkIns.userId, session.user.id),
        eq(checkIns.checkInDate, today)
      )
    );

  // Recalculate streak: find the last check-in before today
  const lastCheckIn = await db.query.checkIns.findFirst({
    where: and(
      eq(checkIns.streakId, streakId),
      eq(checkIns.userId, session.user.id)
    ),
    orderBy: (c, { desc }) => [desc(c.checkInDate)],
  });

  // Recalculate current streak by walking back from last check-in
  let currentStreak = 0;
  if (lastCheckIn) {
    const allCheckIns = await db.query.checkIns.findMany({
      where: and(
        eq(checkIns.streakId, streakId),
        eq(checkIns.userId, session.user.id)
      ),
      orderBy: (c, { desc }) => [desc(c.checkInDate)],
    });

    const checkInDates = new Set(allCheckIns.map((c) => c.checkInDate));
    const d = new Date(lastCheckIn.checkInDate);
    while (checkInDates.has(d.toISOString().split("T")[0])) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }
  }

  await db
    .update(streaks)
    .set({
      currentStreak,
      lastCheckIn: lastCheckIn?.checkInDate || null,
      updatedAt: new Date(),
    })
    .where(eq(streaks.id, streakId));

  revalidatePath("/dashboard");
}

export async function getCheckIns(streakId: string, year: number, month: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  return db.query.checkIns.findMany({
    where: and(
      eq(checkIns.streakId, streakId),
      eq(checkIns.userId, session.user.id),
      gte(checkIns.checkInDate, startDate),
      lte(checkIns.checkInDate, endDate)
    ),
    orderBy: (c, { asc }) => [asc(c.checkInDate)],
  });
}
