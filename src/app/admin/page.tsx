import { getDashboardStats, listRecentCases } from "@/lib/case-service";
import { DashboardClient } from "@/components/admin/dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    listRecentCases(6),
  ]);

  return <DashboardClient stats={stats} recent={recent} />;
}
