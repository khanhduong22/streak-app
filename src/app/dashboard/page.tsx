import { getStreaks } from "@/actions/streak-actions";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const streaks = await getStreaks();

  return <DashboardClient initialStreaks={streaks} />;
}
