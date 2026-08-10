import { apiClient, setApiAccessToken } from "@/services/api/api-client";
import type { AuthMeResponse, AuthSession, AuthUser, BackendAuthUser, LoginCredentials, LoginResponse, LogoutResponse, RefreshResponse } from "@/types/auth";

const endpoints = { login: "/auth/login", me: "/auth/me", logout: "/auth/logout", refresh: "/auth/refresh" } as const;

export function normalizeAuthenticatedUser(raw: BackendAuthUser): AuthUser {
  return {
    id: raw.id,
    username: raw.username,
    firstName: raw.first_name,
    lastName: raw.last_name,
    displayName: raw.name || `${raw.first_name} ${raw.last_name}`.trim(),
    ...(raw.email ? { email: raw.email } : {}),
    status: raw.status,
    school: {
      id: raw.school.id,
      name: raw.school.name,
      ...(raw.school.short_name ? { shortName: raw.school.short_name } : {}),
      status: raw.school.status,
      timezone: raw.school.timezone,
      locale: raw.school.locale,
    },
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

export const authService = {
  async login(credentials: LoginCredentials, signal?: globalThis.AbortSignal): Promise<AuthSession> {
    const { data: response } = await apiClient.post<LoginResponse>(endpoints.login, credentials, { signal, skipAuthRefresh: true });
    const token = response.data?.token ?? response.token;
    setApiAccessToken(token);
    try {
      return { user: await this.me(signal), accessToken: token };
    } catch (error) {
      setApiAccessToken(null);
      throw error;
    }
  },
  async me(signal?: globalThis.AbortSignal): Promise<AuthUser> {
    const { data: response } = await apiClient.get<AuthMeResponse>(endpoints.me, { signal });
    return normalizeAuthenticatedUser(response.data?.user ?? response.user);
  },
  async logout(signal?: globalThis.AbortSignal): Promise<void> {
    await apiClient.post<LogoutResponse>(endpoints.logout, undefined, { signal, skipAuthRefresh: true });
  },
  async refresh(): Promise<string> {
    const { data: response } = await apiClient.post<RefreshResponse>(endpoints.refresh, undefined, { skipAuthRefresh: true });
    return response.data?.token ?? response.token;
  },
};
