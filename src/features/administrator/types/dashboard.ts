import type { UnknownRecord } from "../../dashboard/dashboard-contract.ts";
export interface AdministratorDashboard {
  scope: "school" | "platform";
  school: UnknownRecord | null;
  totalSchools: number | null;
  learnerCount: number | null;
  teacherCount: number | null;
  pendingUserActions: number | null;
  pendingImports: number | null;
  criticalAlerts: number | null;
  upcomingExpiries: number | null;
  failedProvisioningTasks: number | null;
  profileCompleteness: number | null;
  schoolsByLifecycle: Record<string, number>;
  usersByRole: Record<string, number>;
  subscription: UnknownRecord | null;
  moduleReadiness: UnknownRecord[];
  recentActivity: UnknownRecord[];
  systemAlerts: UnknownRecord[];
  lastRefreshedAt: string | null;
}
