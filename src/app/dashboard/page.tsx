import { getStreaks } from "@/actions/streak-actions";
import { getUserStats } from "@/actions/user-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [streaks, stats] = await Promise.all([getStreaks(), getUserStats()]);

  return (
    <DashboardClient
      initialStreaks={streaks}
      aiCoachPersonality={stats.aiCoachPersonality}
      userId={session.user.id}
    />
  );
}
