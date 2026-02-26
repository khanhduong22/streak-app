import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyPools, getActivePools } from "@/actions/death-pool-actions";
import { getUserStats } from "@/actions/user-actions";
import { DeathPoolPageClient } from "@/components/DeathPoolPageClient";
import Link from "next/link";

export default async function DeathPoolPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [myPools, activePools, stats] = await Promise.all([
    getMyPools(),
    getActivePools(),
    getUserStats(),
  ]);

  return (
    <main>
      <div style={{ padding: "16px 20px 0" }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">← Quay lại Dashboard</Link>
      </div>
      <DeathPoolPageClient
        myPools={myPools}
        activePools={activePools}
        userCoins={stats.coins}
      />
    </main>
  );
}
