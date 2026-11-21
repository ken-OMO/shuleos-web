import type { AuthUser } from "@/types/auth";

export function workspaceOptions(user: AuthUser | null) {
  if (!user || user.scope !== "school" || !user.school?.id) return [];
  const roles = new Set(user.roles.map(role => role.name));
  const permissions = new Set(user.permissions.map(permission => permission.name));
  return [
    { label: "School administration", href: "/workspace/admin/school", roles: ["School Admin", "Administrator", "Director", "School Owner"], permissions: ["access_administrator_portal", "view_admin_dashboard"] },
    { label: "Headteacher / leadership", href: "/workspace/leadership", roles: ["Principal", "Headteacher", "Deputy Principal", "Deputy Headteacher", "HOD", "Senior Teacher", "Finance Officer", "Finance Manager", "Examination Officer", "Discipline Lead", "Timetable Manager"], permissions: ["access_leadership_portal_phase_two"] },
    { label: "School office", href: "/workspace/office", roles: ["School Secretary"], permissions: ["access_school_office", "view_school_office_summary"] },
    { label: "Teaching", href: "/workspace/teacher", roles: ["Teacher"], permissions: ["access_teacher_portal"] },
  ].filter(option => option.roles.some(role => roles.has(role)) && option.permissions.every(permission => permissions.has(permission)));
}
