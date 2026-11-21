import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { LeadershipDashboardView } from "@/features/dashboard/components/role-dashboards";

const leadershipRoles = ["Principal", "Headteacher", "Deputy Principal", "Deputy Headteacher", "HOD", "Senior Teacher", "Finance Officer", "Finance Manager", "Examination Officer", "Discipline Lead", "Timetable Manager"];
export default function LeadershipWorkspacePage() { return <RoleGuard roles={leadershipRoles}><PermissionGuard permissions="access_leadership_portal_phase_two"><LeadershipDashboardView /></PermissionGuard></RoleGuard>; }
