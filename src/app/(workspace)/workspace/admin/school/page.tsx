import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { AdministratorDashboardView } from "@/features/dashboard/components/role-dashboards";

export default function SchoolDashboardPage() {
  return <RoleGuard roles={["School Admin", "Administrator", "Director", "School Owner"]}><PermissionGuard permissions="view_admin_dashboard"><AdministratorDashboardView scope="school" /></PermissionGuard></RoleGuard>;
}
