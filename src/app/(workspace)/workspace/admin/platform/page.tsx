import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { AdministratorDashboardView } from "@/features/dashboard/components/role-dashboards";

export default function PlatformDashboardPage() {
  return <RoleGuard roles={["Platform Owner", "Platform Super Administrator"]}><PermissionGuard permissions="view_platform_dashboard"><AdministratorDashboardView scope="platform" /></PermissionGuard></RoleGuard>;
}
