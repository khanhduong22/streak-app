"use server";

import { db } from "@/db";
import { users, streaks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Get Fitbit connection status for the current user */
export async function getFitbitStatus() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { fitbitAccessToken: true, fitbitTokenExpiry: true },
  });

  return {
    connected: !!user?.fitbitAccessToken,
    expiry: user?.fitbitTokenExpiry ?? null,
  };
}

/** Disconnect Fitbit (remove tokens) */
export async function disconnectFitbit() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(users)
    .set({ fitbitAccessToken: null, fitbitRefreshToken: null, fitbitTokenExpiry: null })
    .where(eq(users.id, session.user.id));

  // Also disable auto-checkin for all streaks
  await db.update(streaks)
    .set({ autoCheckinSource: "none" })
    .where(eq(streaks.userId, session.user.id));

  revalidatePath("/settings");
}

/** Enable/disable auto check-in via Fitbit for a streak, and set thresholds */
export async function setAutoCheckin(
  streakId: string,
  source: "none" | "fitbit",
  minMinutes?: number,
  minSteps?: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(streaks)
    .set({
      autoCheckinSource: source,
      ...(minMinutes !== undefined && { autoCheckinMinMinutes: minMinutes }),
      ...(minSteps !== undefined && { autoCheckinMinSteps: minSteps }),
    })
    .where(and(eq(streaks.id, streakId), eq(streaks.userId, session.user.id)));

  revalidatePath("/dashboard");
}
