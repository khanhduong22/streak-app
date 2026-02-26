"use server";

import { db } from "@/db";
import { deathPools, deathPoolMembers, users, checkIns, streaks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createDeathPool({
  name,
  stakeAmount,
  endDate,
}: {
  name: string;
  stakeAmount: number;
  endDate: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("User not found");
  if (user.coins < stakeAmount) throw new Error("Không đủ xu! Hãy check-in để kiếm thêm 🪙");

  const today = new Date().toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    const [pool] = await tx
      .insert(deathPools)
      .values({ name, stakeAmount, startDate: today, endDate, createdBy: userId })
      .returning();

    await tx.insert(deathPoolMembers).values({
      poolId: pool.id,
      userId,
      stakeCoins: stakeAmount,
    });

    await tx.update(users).set({ coins: user.coins - stakeAmount }).where(eq(users.id, userId));
  });

  revalidatePath("/dashboard/death-pool");
}

export async function joinDeathPool(poolId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const pool = await db.query.deathPools.findFirst({ where: eq(deathPools.id, poolId) });
  if (!pool) throw new Error("Pool not found");
  if (pool.status !== "active") throw new Error("Pool đã kết thúc");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("User not found");
  if (user.coins < pool.stakeAmount) throw new Error("Không đủ xu!");

  // Check if already a member
  const existing = await db.query.deathPoolMembers.findFirst({
    where: and(eq(deathPoolMembers.poolId, poolId), eq(deathPoolMembers.userId, userId)),
  });
  if (existing) throw new Error("Bạn đã tham gia pool này rồi!");

  await db.transaction(async (tx) => {
    await tx.insert(deathPoolMembers).values({
      poolId,
      userId,
      stakeCoins: pool.stakeAmount,
    });
    await tx.update(users).set({ coins: user.coins - pool.stakeAmount }).where(eq(users.id, userId));
  });

  revalidatePath("/dashboard/death-pool");
}

export async function getMyPools() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const memberships = await db.query.deathPoolMembers.findMany({
    where: eq(deathPoolMembers.userId, userId),
    with: {
      pool: {
        with: { members: { with: { user: { columns: { name: true, email: true, image: true } } } } },
      },
    },
  });

  const today = new Date().toISOString().split("T")[0];

  // For each pool, check which members checked in today
  const enriched = await Promise.all(
    memberships.map(async (m) => {
      const pool = m.pool;
      const memberStatuses = await Promise.all(
        pool.members.map(async (member) => {
          // Find any streak checked in today for this user
          const todayCheckIns = await db.query.checkIns.findFirst({
            where: and(
              eq(checkIns.userId, member.userId),
              eq(checkIns.checkInDate, today),
              eq(checkIns.status, "checked_in")
            ),
          });
          return {
            ...member,
            checkedInToday: !!todayCheckIns,
          };
        })
      );
      return { pool, memberStatuses, myMembership: m };
    })
  );

  return enriched;
}

export async function checkDeathPoolElimination(poolId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const pool = await db.query.deathPools.findFirst({
    where: eq(deathPools.id, poolId),
    with: { members: { with: { user: true } } },
  });
  if (!pool || pool.status !== "active") return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const eliminated: string[] = [];
  for (const member of pool.members) {
    if (!member.isActive) continue;
    const checkedIn = await db.query.checkIns.findFirst({
      where: and(
        eq(checkIns.userId, member.userId),
        eq(checkIns.checkInDate, yesterdayStr),
        eq(checkIns.status, "checked_in")
      ),
    });
    if (!checkedIn) eliminated.push(member.userId);
  }

  if (eliminated.length === 0) return;

  // Total coins to redistribute from eliminated members
  const totalEliminated = eliminated.length;
  const activeMembers = pool.members.filter(
    (m) => m.isActive && !eliminated.includes(m.userId)
  );

  if (activeMembers.length === 0) return;

  const coinsPerSurvivor = Math.floor(
    (totalEliminated * pool.stakeAmount) / activeMembers.length
  );

  await db.transaction(async (tx) => {
    // Mark eliminated
    for (const uid of eliminated) {
      await tx
        .update(deathPoolMembers)
        .set({ isActive: false })
        .where(and(eq(deathPoolMembers.poolId, poolId), eq(deathPoolMembers.userId, uid)));
    }

    // Distribute coins to survivors
    for (const survivor of activeMembers) {
      const user = await tx.query.users.findFirst({ where: eq(users.id, survivor.userId) });
      if (user) {
        await tx.update(users).set({ coins: user.coins + coinsPerSurvivor }).where(eq(users.id, survivor.userId));
      }
    }

    // Check if pool should end
    if (activeMembers.length <= 1) {
      await tx.update(deathPools).set({ status: "ended" }).where(eq(deathPools.id, poolId));
    }
  });

  revalidatePath("/dashboard/death-pool");
}

export async function getActivePools() {
  const pools = await db.query.deathPools.findMany({
    where: eq(deathPools.status, "active"),
    with: { members: true, creator: { columns: { name: true, email: true } } },
  });
  return pools;
}
