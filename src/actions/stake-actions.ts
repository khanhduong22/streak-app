"use server";

import { db } from "@/db";
import { streaks, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const STAKE_PAYOUT_MULTIPLIER = 1.5; // Win 1.5x the stake back

/** Place a stake on a streak. Deducts coins immediately. */
export async function placeStake(streakId: string, stakeAmount: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (stakeAmount <= 0) throw new Error("Stake must be greater than 0");

  const [streak, user] = await Promise.all([
    db.query.streaks.findFirst({
      where: and(eq(streaks.id, streakId), eq(streaks.userId, userId)),
    }),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);

  if (!streak) throw new Error("Streak not found");
  if (!user) throw new Error("User not found");
  if (streak.stakeStatus === "active") throw new Error("This streak already has an active stake");
  if (streak.targetDays === 0 || !streak.targetDays) throw new Error("Set a target goal first before staking!");
  if (user.coins < stakeAmount) throw new Error(`Not enough coins! You have ${user.coins} 🪙 but need ${stakeAmount} 🪙`);

  await db.transaction(async (tx) => {
    // Deduct coins
    await tx.update(users).set({ coins: user.coins - stakeAmount }).where(eq(users.id, userId));
    // Activate stake
    await tx.update(streaks).set({ stakeAmount, stakeStatus: "active" }).where(eq(streaks.id, streakId));
  });

  revalidatePath("/dashboard");
}

/** Claim the win payout when target is reached */
export async function claimStakeWin(streakId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [streak, user] = await Promise.all([
    db.query.streaks.findFirst({
      where: and(eq(streaks.id, streakId), eq(streaks.userId, userId)),
    }),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);

  if (!streak || !user) throw new Error("Not found");
  if (streak.stakeStatus !== "active") throw new Error("No active stake to claim");
  if (!streak.targetDays || streak.currentStreak < streak.targetDays) {
    throw new Error(`Not there yet! Need ${streak.targetDays} days, at ${streak.currentStreak} now.`);
  }

  const payout = Math.floor(streak.stakeAmount * STAKE_PAYOUT_MULTIPLIER);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ coins: user.coins + payout }).where(eq(users.id, userId));
    await tx.update(streaks).set({ stakeStatus: "won", stakeAmount: 0 }).where(eq(streaks.id, streakId));
  });

  revalidatePath("/dashboard");
  return { payout };
}

/** Called when a streak breaks (called from checkIn logic) — burns the stake */
export async function forfeitStake(streakId: string, userId: string) {
  const streak = await db.query.streaks.findFirst({
    where: and(eq(streaks.id, streakId), eq(streaks.userId, userId)),
  });
  if (!streak || streak.stakeStatus !== "active") return; // No active stake, nothing to forfeit

  await db.update(streaks)
    .set({ stakeStatus: "lost", stakeAmount: 0 })
    .where(eq(streaks.id, streakId));

  // Note: coins were already deducted when stake was placed, so we just mark as lost
}
