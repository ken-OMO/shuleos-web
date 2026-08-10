import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { TeacherDashboardView } from "@/features/dashboard/components/role-dashboards";
export default function TeacherWorkspacePage() { return <RoleGuard roles="Teacher"><PermissionGuard permissions="access_teacher_portal"><TeacherDashboardView /></PermissionGuard></RoleGuard>; }
