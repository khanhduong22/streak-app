import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { checkIns, streaks } from "@/db/schema";
import { eq, and, gte, lte, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // format: "2026-02"

  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [new Date().getFullYear(), new Date().getMonth()]; // previous month

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const startDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const endMonth = prevMonth === 12 ? 1 : prevMonth + 1;
  const endYear = prevMonth === 12 ? prevYear + 1 : prevYear;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  // Get all check-ins for this user in the month
  const monthCheckIns = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.userId, userId),
      gte(checkIns.checkInDate, startDate),
      lte(checkIns.checkInDate, endDate),
      eq(checkIns.status, "checked_in")
    ),
    with: { streak: true },
  });

  if (monthCheckIns.length === 0) {
    return NextResponse.json({
      totalCheckIns: 0,
      month: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
    });
  }

  // Count by day of week
  const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun=0 ... Sat=6
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (const ci of monthCheckIns) {
    const d = new Date(ci.checkInDate + "T00:00:00");
    dayCount[d.getDay()]++;
  }
  const strongestDayIdx = dayCount.indexOf(Math.max(...dayCount));

  // Most consistent habit (by streak)
  const habitCount: Record<string, { title: string; count: number }> = {};
  for (const ci of monthCheckIns) {
    if (!habitCount[ci.streakId]) {
      habitCount[ci.streakId] = { title: ci.streak?.title || "Unknown", count: 0 };
    }
    habitCount[ci.streakId].count++;
  }
  const topHabit = Object.values(habitCount).sort((a, b) => b.count - a.count)[0];

  // Unique days checked in
  const uniqueDays = new Set(monthCheckIns.map((ci) => ci.checkInDate)).size;

  // Days in month
  const daysInMonth = new Date(prevYear, prevMonth, 0).getDate();
  const consistency = Math.round((uniqueDays / daysInMonth) * 100);

  // Calc best streak in month
  const sortedDates = [...new Set(monthCheckIns.map((ci) => ci.checkInDate))].sort();
  let bestStreak = 0;
  let currentStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      currentStreak++;
    } else {
      bestStreak = Math.max(bestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  // Mock percentile (simple heuristic based on consistency)
  const percentile = Math.min(99, Math.round(consistency * 0.95 + Math.random() * 5));

  // Saved streaks (frozen days used as proxy)
  const frozenDays = monthCheckIns.filter(ci => ci.status === "checked_in" && ci.mood === "tired").length;

  return NextResponse.json({
    month: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
    totalCheckIns: monthCheckIns.length,
    uniqueDays,
    daysInMonth,
    consistency,
    bestStreak,
    strongestDay: DAYS[strongestDayIdx],
    mostConsistentHabit: topHabit?.title || "—",
    percentile,
    savedStreaks: frozenDays,
    totalHabits: Object.keys(habitCount).length,
  });
}
