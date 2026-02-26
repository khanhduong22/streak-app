"use server";

import { db } from "@/db";
import { coopInvites, streaks, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Send a co-op invite to a partner email for one of your streaks */
export async function sendCoopInvite(fromStreakId: string, toEmail: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Verify this streak belongs to user
  const streak = await db.query.streaks.findFirst({
    where: and(eq(streaks.id, fromStreakId), eq(streaks.userId, userId)),
  });
  if (!streak) throw new Error("Streak not found");

  // Can't invite yourself
  if (session.user.email?.toLowerCase() === toEmail.toLowerCase()) {
    throw new Error("You can't invite yourself!");
  }

  // Can't invite if streak is already in a co-op
  if (streak.coopPartnerStreakId) {
    throw new Error("This streak already has a co-op partner. Remove the existing partner first.");
  }

  // Check for existing pending invite
  const existing = await db.query.coopInvites.findFirst({
    where: and(
      eq(coopInvites.fromStreakId, fromStreakId),
      eq(coopInvites.toEmail, toEmail.toLowerCase()),
      eq(coopInvites.status, "pending")
    ),
  });
  if (existing) throw new Error("You already sent an invite to this email. Waiting for them to accept.");

  await db.insert(coopInvites).values({
    fromStreakId,
    fromUserId: userId,
    toEmail: toEmail.toLowerCase(),
  });

  revalidatePath("/dashboard");
}

/** Get all pending co-op invites sent TO the currently logged-in user  */
export async function getPendingInvites() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const myEmail = session.user.email?.toLowerCase() || "";

  const invites = await db.query.coopInvites.findMany({
    where: and(
      eq(coopInvites.toEmail, myEmail),
      eq(coopInvites.status, "pending")
    ),
    with: {
      fromUser: { columns: { name: true, email: true, image: true } },
      fromStreak: { columns: { title: true, emoji: true, color: true } },
    },
  });

  return invites;
}

/** Accept a co-op invite: user must provide which of their streaks to pair */
export async function acceptCoopInvite(inviteId: string, myStreakId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    // 1. Load invite
    const invite = await tx.query.coopInvites.findFirst({
      where: and(eq(coopInvites.id, inviteId), eq(coopInvites.status, "pending")),
    });
    if (!invite) throw new Error("Invite not found or already processed");

    // 2. Validate that `myStreakId` belongs to me
    const myStreak = await tx.query.streaks.findFirst({
      where: and(eq(streaks.id, myStreakId), eq(streaks.userId, userId)),
    });
    if (!myStreak) throw new Error("Streak not found");
    if (myStreak.coopPartnerStreakId) throw new Error("This streak already has a co-op partner");

    // 3. Link the two streaks together (bidirectional)
    await tx.update(streaks).set({ coopPartnerStreakId: myStreakId }).where(eq(streaks.id, invite.fromStreakId));
    await tx.update(streaks).set({ coopPartnerStreakId: invite.fromStreakId }).where(eq(streaks.id, myStreakId));

    // 4. Update invite as accepted
    await tx.update(coopInvites).set({ status: "accepted", toStreakId: myStreakId }).where(eq(coopInvites.id, inviteId));
  });

  revalidatePath("/dashboard");
}

/** Reject a co-op invite */
export async function rejectCoopInvite(inviteId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(coopInvites).set({ status: "rejected" }).where(eq(coopInvites.id, inviteId));
  revalidatePath("/dashboard");
}

/** Dissolve the co-op partnership for a given streak */
export async function dissolveCoopPartnership(streakId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    const myStreak = await tx.query.streaks.findFirst({
      where: and(eq(streaks.id, streakId), eq(streaks.userId, userId)),
    });
    if (!myStreak || !myStreak.coopPartnerStreakId) throw new Error("No co-op partner found");

    // Remove from both sides
    await tx.update(streaks).set({ coopPartnerStreakId: null }).where(eq(streaks.id, streakId));
    await tx.update(streaks).set({ coopPartnerStreakId: null }).where(eq(streaks.id, myStreak.coopPartnerStreakId));
  });

  revalidatePath("/dashboard");
}

/** Get co-op partner info for a streak (if any) */
export async function getCoopPartner(streakId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const streak = await db.query.streaks.findFirst({
    where: eq(streaks.id, streakId),
  });
  if (!streak?.coopPartnerStreakId) return null;

  const partnerStreak = await db.query.streaks.findFirst({
    where: eq(streaks.id, streak.coopPartnerStreakId),
  });
  if (!partnerStreak) return null;

  const partnerUser = await db.query.users.findFirst({
    where: eq(users.id, partnerStreak.userId),
    columns: { name: true, email: true, image: true },
  });

  const today = new Date().toISOString().split("T")[0];
  const partnerCheckedInToday = partnerStreak.lastCheckIn === today;

  return {
    partnerStreak,
    partnerUser: partnerUser ?? null,
    partnerCheckedInToday,
  };
}
