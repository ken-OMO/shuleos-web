import { AlertTriangle, BookOpen, Building2, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, Landmark, ListTodo, School, UsersRound } from "lucide-react";
import { navigationItemVisible, workspacePathForRoles } from "@/features/dashboard/dashboard-policy";
import type { AuthUser } from "@/types/auth";
import type { NavigationItem, NavigationSection } from "@/types/navigation";

const candidates: NavigationItem[] = [
  { title: "Dashboard", href: "", icon: LayoutDashboard },
  { title: "Tasks", href: "#tasks", icon: ListTodo, permissions: ["view_admin_tasks"] },
{ title: "Teacher tasks", href: "/workspace/teacher/tasks", icon: ListTodo, roles: ["Teacher"], permissions: ["access_teacher_portal"], absolute: true },
  { title: "Alerts", href: "#alerts", icon: AlertTriangle, permissions: ["view_admin_alerts"] },
  { title: "School readiness", href: "#readiness", icon: School, permissions: ["view_school_completeness"] },
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
    .filter((item) => navigationItemVisible(item, [...roles], [...permissions]))
    .map((item) => ({ ...item, href: item.absolute ? item.href : `${dashboard}${item.href}` }));
  return [{ label: "Workspace", items }];
}
