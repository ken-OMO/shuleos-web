import type { AuthUser, BackendAuthUser } from "../../types/auth.ts";

export function normalizeAuthenticatedUser(raw: BackendAuthUser): AuthUser {
  if (!["school", "platform"].includes(raw.scope)) throw new Error("Invalid authentication scope");
  if ((raw.scope === "school" && (!raw.school || raw.school.id !== raw.school_id)) || (raw.scope === "platform" && (raw.school !== null || raw.school_id !== null))) throw new Error("Invalid authentication scope");
  return {
    id: raw.id,
    username: raw.username,
    firstName: raw.first_name,
    lastName: raw.last_name,
    displayName: raw.name || `${raw.first_name} ${raw.last_name}`.trim(),
    ...(raw.email ? { email: raw.email } : {}),
    status: raw.status,
    scope: raw.scope,
    school: raw.school ? {
      id: raw.school.id,
      name: raw.school.name,
      ...(raw.school.short_name ? { shortName: raw.school.short_name } : {}),
      status: raw.school.status,
      timezone: raw.school.timezone,
      locale: raw.school.locale,
    } : null,
    roles: [...new Set(raw.roles)].sort().map((name) => ({ name })),
    permissions: [...new Set(raw.permissions)].sort().map((name) => ({ name })),
    passwordResetRequired: raw.password_reset_required,
    account: {
      active: raw.account.active,
      locked: raw.account.locked,
      requiresPasswordReset: raw.account.requires_password_reset,
    },
  };
}
