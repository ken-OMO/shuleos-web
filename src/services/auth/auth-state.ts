import type { AuthPermission, AuthRole, AuthSchool, AuthStatus, AuthUser } from "../../types/auth.ts";

export interface AuthSnapshot {
  status: AuthStatus;
  user: AuthUser | null;
  school: AuthSchool | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
  accessToken: string | null;
}

export const initialAuthSnapshot: AuthSnapshot = {
  status: "idle",
  user: null,
  school: null,
  roles: [],
  permissions: [],
  accessToken: null,
};

export function authenticatedSnapshot(user: AuthUser, accessToken: string): AuthSnapshot {
  return {
    status: "authenticated",
    user,
    school: user.school,
    roles: user.roles,
    permissions: user.permissions,
    accessToken,
  };
}

export function clearedSnapshot(status: "guest" | "expired" = "guest"): AuthSnapshot {
  return { status, user: null, school: null, roles: [], permissions: [], accessToken: null };
}

export function canAuthorize(snapshot: AuthSnapshot): boolean {
  return snapshot.status === "authenticated" && Boolean(snapshot.user && snapshot.accessToken);
}
