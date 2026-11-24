import { AlertTriangle, BookOpen, Building2, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, Landmark, ListTodo, School, UsersRound } from "lucide-react";
import { navigationItemVisible, workspacePathForRoles } from "@/features/dashboard/dashboard-policy";
import type { AuthUser } from "@/types/auth";
import type { NavigationItem, NavigationSection } from "@/types/navigation";

const candidates: NavigationItem[] = [
  { title: "Learning-area assignments", href: "/workspace/admin/school/learning-area-assignments", absolute: true, icon: BookOpen },
  { title: "Learner admission", href: "/workspace/admin/school/learner-admission", absolute: true, icon: GraduationCap, permissions: ["manage_learners"] },
  { title: "Co-curricular", href: "/workspace/admin/school/co-curricular", absolute: true, icon: School, permissions: ["manage_learners"] },
  { title: "Academic setup", href: "/workspace/admin/school/academic-setup", absolute: true, icon: CalendarDays, roles: ["Headteacher", "Principal"], permissions: ["access_school_leadership_portal", "manage_academics"] },
  { title: "Invite school users", href: "/workspace/admin/school/users", absolute: true, icon: School, roles: ["School Admin", "Administrator", "Director", "School Owner"], permissions: ["access_administrator_portal", "create_school_users", "activate_school_users"] },
  { title: "Staff access", href: "/workspace/admin/school/staff-access", absolute: true, icon: UsersRound, roles: ["School Admin", "Administrator", "Director", "School Owner"], permissions: ["access_administrator_portal", "update_school_users", "assign_school_permissions"] },
  { title: "Dashboard", href: "", icon: LayoutDashboard },
  { title: "Subscription catalog", href: "/workspace/admin/platform/subscription-catalog", icon: Landmark, absolute: true, roles: ["Platform Owner"], permissions: ["access_administrator_portal", "access_platform_administration"] },
  { title: "School registrations", href: "/workspace/admin/platform/registrations", icon: School, absolute: true, roles: ["Platform Owner", "Platform Super Administrator"], permissions: ["access_administrator_portal", "access_platform_administration", "onboard_schools"] },
  { title: "Schools", href: "/workspace/admin/platform/schools", icon: Building2, absolute: true, roles: ["Platform Owner", "Platform Super Administrator"], permissions: ["access_administrator_portal", "access_platform_administration", "manage_school_lifecycle"] },
  { title: "Tasks", href: "#tasks", icon: ListTodo, permissions: ["view_admin_tasks"] },
{ title: "Teacher tasks", href: "/workspace/teacher/tasks", icon: ListTodo, roles: ["Teacher"], permissions: ["access_teacher_portal"], absolute: true },
  { title: "Alerts", href: "#alerts", icon: AlertTriangle, permissions: ["view_admin_alerts"] },
  { title: "School readiness", href: "#readiness", icon: School, permissions: ["view_academic_setup_status"] },
  { title: "Platform distribution", href: "#distribution", icon: Building2, permissions: ["view_platform_dashboard"] },
  { title: "Leadership actions", href: "#actions", icon: ClipboardCheck, permissions: ["view_leadership_action_queue"] },
  { title: "Finance oversight", href: "#finance", icon: Landmark, permissions: ["view_finance_oversight"] },
  { title: "Today's timetable", href: "#timetable", icon: CalendarDays, permissions: ["access_teacher_portal"] },
  { title: "Teaching assignments", href: "#assignments", icon: BookOpen, roles: ["Teacher"] },
  { title: "Linked children", href: "#children", icon: UsersRound, permissions: ["view_linked_learners"] },
  { title: "Homework", href: "#homework", icon: BookOpen, permissions: ["access_learner_portal_phase_two"] },
  { title: "Learning resources", href: "#resources", icon: GraduationCap, permissions: ["view_published_learning_resources"] },
];

export function navigationForUser(user: AuthUser | null): NavigationSection[] {
  if (!user) return [{ label: "Preview", items: [{ title: "Dashboard preview", href: "/preview", icon: LayoutDashboard }] }];
  const dashboard = workspacePathForRoles(user.roles.map((role) => role.name));
  const roles = new Set(user.roles.map((role) => role.name));
  const permissions = new Set(user.permissions.map((permission) => permission.name));
  const items = candidates
    .filter((item) => !["Academic setup", "Invite school users", "Co-curricular", "Learner admission"].includes(item.title) || user.scope === "school")
    .filter((item) => !["Schools", "School registrations", "Subscription catalog"].includes(item.title) || user.scope === "platform")
    .filter((item) => item.title !== "Learning-area assignments" || (user.scope === "school" &&
      ((roles.has("Headteacher") && permissions.has("manage_academics")) ||
        (roles.has("School Admin") && permissions.has("access_administrator_portal")))))
    .filter((item) => item.href !== "#readiness" || (user.scope === "school" && dashboard === "/workspace/admin/school"))
    .filter((item) => navigationItemVisible(item, [...roles], [...permissions]))
    .map((item) => ({ ...item, href: item.absolute ? item.href : `${dashboard}${item.href}` }));
  return [{ label: "Workspace", items }];
}
