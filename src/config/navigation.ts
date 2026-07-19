import { BarChart3, BellRing, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, Landmark, Megaphone, Settings, UsersRound } from "lucide-react";
import type { AuthUser } from "@/types/auth";
import type { NavigationSection } from "@/types/navigation";

export const navigation: NavigationSection[] = [
  { label: "Workspace", items: [
    { title: "Dashboard", href: "/preview", icon: LayoutDashboard },
    { title: "Academic", href: "/preview#academic", icon: GraduationCap },
    { title: "Teaching", href: "/preview#teaching", icon: BookOpen },
    { title: "Assessments", href: "/preview#assessments", icon: ClipboardCheck },
    { title: "Attendance", href: "/preview#attendance", icon: UsersRound },
    { title: "Timetable", href: "/preview#timetable", icon: CalendarDays },
  ] },
  { label: "Operations", items: [
    { title: "Finance", href: "/preview#finance", icon: Landmark },
    { title: "Communication", href: "/preview#communication", icon: Megaphone, badge: "3" },
    { title: "Reports", href: "/preview#reports", icon: BarChart3 },
    { title: "Administration", href: "/preview#administration", icon: Settings },
    { title: "Notifications", href: "/preview#notifications", icon: BellRing },
  ] },
];

export function navigationForUser(user: AuthUser | null): NavigationSection[] {
  return navigation.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const roleAllowed = !item.roles?.length || item.roles.some((role) => user?.roles.includes(role));
      const permissionAllowed = !item.permissions?.length || item.permissions.every((permission) => user?.permissions.includes(permission));
      return roleAllowed && permissionAllowed;
    }),
  })).filter((section) => section.items.length > 0);
}
