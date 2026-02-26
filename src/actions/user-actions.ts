"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getUserStats() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { coins: true, freezeTokens: true },
  });

  return user || { coins: 0, freezeTokens: 0 };
}

export async function buyFreezeToken() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) throw new Error("User not found");

  const PRICE = 100;

  if (user.coins < PRICE) {
    throw new Error("Not enough coins. Check in daily to earn more!");
  }

  await db
    .update(users)
    .set({
      coins: user.coins - PRICE,
      freezeTokens: user.freezeTokens + 1,
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard");
}
