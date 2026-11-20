export type AuthStatus = "idle" | "hydrating" | "authenticated" | "guest" | "expired";

export interface AuthSchool {
  id: string;
  name: string;
  shortName?: string;
  status: string;
  timezone: string;
  locale: string;
}

export interface AuthRole { name: string }
export interface AuthPermission { name: string }

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string;
  status: string;
  scope: "school" | "platform";
  school: AuthSchool | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
  passwordResetRequired: boolean;
  account: { active: boolean; locked: boolean; requiresPasswordReset: boolean };
}

export interface LoginCredentials { username: string; password: string }

export interface BackendAuthUser {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  username: string;
  email?: string | null;
  status: string;
  scope: "school" | "platform";
  school_id: string | null;
  school: {
    id: string;
    name: string;
    short_name?: string | null;
    status: string;
    timezone: string;
    locale: string;
  } | null;
  roles: string[];
  permissions: string[];
  password_reset_required: boolean;
  account: { active: boolean; locked: boolean; requires_password_reset: boolean };
}

interface TokenData { user: BackendAuthUser; token: string; token_type: "bearer"; expires_in: number }
export interface LoginResponse { success: true; token: string; user: BackendAuthUser; data: TokenData }
export interface AuthMeResponse { success: true; user: BackendAuthUser; data: { user: BackendAuthUser } }
export interface RefreshResponse { success: true; token: string; user: BackendAuthUser; data: TokenData }
export interface LogoutResponse { success: true; message: string }
export interface AuthSession { user: AuthUser; accessToken: string }
export type AuthErrorKind = "validation" | "unauthenticated" | "forbidden" | "account_unavailable" | "network" | "server" | "unknown";

export type SignInScope = "school" | "platform";
export interface AuthChallenge {
  kind: "otp" | "activation";
  scope: SignInScope;
  challengeId: string;
  secret: string;
  expiresAt: number;
}
export type SignInResult = { kind: "authenticated"; session: AuthSession } | { kind: "challenge"; challenge: AuthChallenge };
