import { apiClient, setApiAccessToken } from "@/services/api/api-client";
import type { AuthMeResponse, AuthRole, AuthSession, AuthUser, BackendAuthUser, LoginCredentials, LoginResponse, LogoutResponse, RefreshResponse } from "@/types/auth";

const endpoints = {
  login: "/auth/login",
  me: "/auth/me",
  logout: "/auth/logout",
  refresh: "/auth/refresh",
} as const;

function normalizeUser(raw: BackendAuthUser, passwordResetRequired = false): AuthUser {
  const nestedRoles = raw.roles ?? [];
  const roles: AuthRole[] = [raw.role, ...nestedRoles]
    .filter((role): role is NonNullable<typeof role> => Boolean(role))
    .filter((role, index, all) => all.findIndex((candidate) => candidate.id === role.id) === index)
    .map((role) => ({ id: role.id, name: role.role_name }));
  if (!roles.some((role) => role.id === raw.role_id)) roles.unshift({ id: raw.role_id });
  const permissions = (raw.permissions ?? []).map((permission) => ({ name: typeof permission === "string" ? permission : permission.permission_name }));

  return {
    id: raw.id,
    username: raw.username,
    firstName: raw.first_name,
    lastName: raw.last_name,
    displayName: `${raw.first_name} ${raw.last_name}`.trim(),
    ...(raw.email ? { email: raw.email } : {}),
    school: {
      id: raw.school_id,
      ...(raw.school?.school_name ? { name: raw.school.school_name } : {}),
      ...(raw.school?.school_code ? { code: raw.school.school_code } : {}),
      ...(raw.school?.lifecycle_state ? { lifecycleState: raw.school.lifecycle_state } : {}),
    },
    primaryRoleId: raw.role_id,
    roles,
    permissions,
    passwordResetRequired: raw.password_reset_required ?? passwordResetRequired,
  };
}

export const authService = {
  async login(credentials: LoginCredentials, signal?: globalThis.AbortSignal): Promise<AuthSession> {
    const { data } = await apiClient.post<LoginResponse>(endpoints.login, credentials, { signal, skipAuthRefresh: true });
    setApiAccessToken(data.token);
    try {
      const user = await this.me(signal);
      return { user: { ...user, passwordResetRequired: data.user.password_reset_required ?? user.passwordResetRequired }, accessToken: data.token };
    } catch (error) {
      setApiAccessToken(null);
      throw error;
    }
  },

  async me(signal?: globalThis.AbortSignal): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthMeResponse>(endpoints.me, { signal });
    return normalizeUser(data.user);
  },

  async logout(signal?: globalThis.AbortSignal): Promise<void> {
    await apiClient.post<LogoutResponse>(endpoints.logout, undefined, { signal, skipAuthRefresh: true });
  },

  async refresh(): Promise<string> {
    const { data } = await apiClient.post<RefreshResponse>(endpoints.refresh, undefined, { skipAuthRefresh: true });
    return data.token;
  },
};
