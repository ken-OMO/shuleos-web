export type WorkspaceKind = "platform-admin" | "school-admin" | "leadership" | "teacher" | "parent" | "learner" | "office" | "generic";

const rules: Array<{ kind: WorkspaceKind; roles: string[] }> = [
  { kind: "platform-admin", roles: ["Platform Owner", "Platform Super Administrator"] },
  { kind: "school-admin", roles: ["School Admin", "Administrator", "Director", "School Owner"] },
  { kind: "leadership", roles: ["Principal", "Headteacher", "Deputy Principal", "Deputy Headteacher", "HOD", "Senior Teacher", "Finance Officer", "Finance Manager", "Examination Officer", "Discipline Lead", "Timetable Manager"] },
  { kind: "office", roles: ["School Secretary"] },
  { kind: "teacher", roles: ["Teacher"] },
  { kind: "parent", roles: ["Parent"] },
  { kind: "learner", roles: ["Learner"] },
];

export function workspaceKindForRoles(roleNames: string[]): WorkspaceKind {
  const roles = new Set(roleNames.map((role) => role.toLowerCase()));
  return rules.find((rule) => rule.roles.some((role) => roles.has(role.toLowerCase())))?.kind ?? "generic";
}

export function workspacePathForRoles(roleNames: string[]): string {
  return ({
    "platform-admin": "/workspace/admin/platform",
    "school-admin": "/workspace/admin/school",
    leadership: "/workspace/leadership",
    office: "/workspace/office",
    teacher: "/workspace/teacher",
    parent: "/workspace/parent",
    learner: "/workspace/learner",
    generic: "/workspace",
  } satisfies Record<WorkspaceKind, string>)[workspaceKindForRoles(roleNames)];
}

export interface DashboardActionPolicy { key: string; permission?: string; excludedRoles?: string[] }

export function navigationItemVisible(item: { roles?: string[]; permissions?: string[] }, roles: string[], permissions: string[]): boolean {
  const roleSet = new Set(roles);
  const permissionSet = new Set(permissions);
  return (!item.roles?.length || item.roles.some((role) => roleSet.has(role)))
    && (!item.permissions?.length || item.permissions.every((permission) => permissionSet.has(permission)));
}

export function visibleActionKeys(actions: DashboardActionPolicy[], roles: string[], permissions: string[]): string[] {
  const roleSet = new Set(roles.map((role) => role.toLowerCase()));
  const permissionSet = new Set(permissions);
  return actions.filter((action) => (!action.permission || permissionSet.has(action.permission))
    && !(action.excludedRoles ?? []).some((role) => roleSet.has(role.toLowerCase()))).map((action) => action.key);
}
