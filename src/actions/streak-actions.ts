"use server";

import { db } from "@/db";
import { streaks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getStreaks() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.query.streaks.findMany({
    where: eq(streaks.userId, session.user.id),
    orderBy: (s, { desc }) => [desc(s.updatedAt)],
  });
}

export async function createStreak(data: {
  title: string;
  emoji: string;
  color: string;
  targetDays: number;
  zenMode?: boolean;
  impactMultiplier?: number;
  impactUnit?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.insert(streaks).values({
    userId: session.user.id,
    title: data.title,
    emoji: data.emoji,
    color: data.color,
    targetDays: data.targetDays,
    zenMode: data.zenMode ?? false,
    impactMultiplier: data.impactMultiplier ?? 0,
    impactUnit: data.impactUnit ?? "",
  });

  revalidatePath("/dashboard");
}

export async function updateStreak(
  id: string,
  data: { title: string; emoji: string; color: string; targetDays: number; zenMode?: boolean; impactMultiplier?: number; impactUnit?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(streaks)
    .set({
      title: data.title,
      emoji: data.emoji,
      color: data.color,
      targetDays: data.targetDays,
      zenMode: data.zenMode ?? false,
      impactMultiplier: data.impactMultiplier ?? 0,
      impactUnit: data.impactUnit ?? "",
      updatedAt: new Date(),
    })
    .where(and(eq(streaks.id, id), eq(streaks.userId, session.user.id)));

  revalidatePath("/dashboard");
}

export async function deleteStreak(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(streaks)
    .where(and(eq(streaks.id, id), eq(streaks.userId, session.user.id)));

  revalidatePath("/dashboard");
}
