export type AuthStatus = "idle" | "hydrating" | "authenticated" | "guest" | "expired";

export interface AuthSchool {
  id: string;
  name?: string;
  code?: string;
  lifecycleState?: string;
}

export interface AuthRole {
  id: string;
  name?: string;
}

export interface AuthPermission {
  name: string;
}

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string;
  school: AuthSchool;
  primaryRoleId: string;
  roles: AuthRole[];
  permissions: AuthPermission[];
  passwordResetRequired: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface BackendAuthUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  school_id: string;
  role_id: string;
  password_reset_required?: boolean;
  role?: { id: string; role_name: string } | null;
  roles?: Array<{ id: string; role_name: string }>;
  permissions?: Array<string | { permission_name: string }>;
  school?: { id: string; school_name: string; school_code?: string | null; lifecycle_state?: string | null } | null;
}

export interface LoginResponse {
  success: true;
  token: string;
  user: BackendAuthUser;
}

export interface AuthMeResponse {
  success: true;
  user: BackendAuthUser;
}

export interface RefreshResponse {
  success: true;
  token: string;
}

export interface LogoutResponse {
  success: true;
  message: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export type AuthErrorKind = "validation" | "unauthenticated" | "forbidden" | "account_unavailable" | "network" | "server" | "unknown";
