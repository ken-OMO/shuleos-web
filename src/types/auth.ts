export type AuthStatus = "hydrating" | "authenticating" | "authenticated" | "guest";

export interface SchoolContext {
  id: string;
  name: string;
  code?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  roles: string[];
  permissions: string[];
  school: SchoolContext | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}
