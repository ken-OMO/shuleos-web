import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { ParentDashboardView } from "@/features/dashboard/components/role-dashboards";
export default function ParentWorkspacePage() { return <RoleGuard roles="Parent"><PermissionGuard permissions="access_parent_portal_phase_two"><ParentDashboardView /></PermissionGuard></RoleGuard>; }
