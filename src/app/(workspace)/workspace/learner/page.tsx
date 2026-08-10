import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { LearnerDashboardView } from "@/features/dashboard/components/role-dashboards";
export default function LearnerWorkspacePage() { return <RoleGuard roles="Learner"><PermissionGuard permissions="access_learner_portal_phase_two"><LearnerDashboardView /></PermissionGuard></RoleGuard>; }
