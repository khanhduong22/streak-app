"use server";

import { db } from "@/db";
import { users, streaks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Get Google Fit connection status for the current user */
export async function getFitStatus() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { fitAccessToken: true, fitTokenExpiry: true },
  });

  return {
    connected: !!user?.fitAccessToken,
    expiry: user?.fitTokenExpiry ?? null,
  };
}

/** Disconnect Google Fit (remove tokens) */
export async function disconnectFit() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(users)
    .set({ fitAccessToken: null, fitRefreshToken: null, fitTokenExpiry: null })
    .where(eq(users.id, session.user.id));

  // Also disable auto-checkin for all streaks
  await db.update(streaks)
    .set({ autoCheckinSource: "none" })
    .where(eq(streaks.userId, session.user.id));

  revalidatePath("/settings");
}

/** Enable/disable auto check-in for a streak, and set thresholds */
export async function setAutoCheckin(
  streakId: string,
  source: "none" | "google_fit",
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
