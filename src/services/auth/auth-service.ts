import type { AxiosRequestConfig } from "axios";
import { apiClient, configureTokenRefresh } from "@/services/api/api-client";
import type { ApiEnvelope } from "@/services/api/api-types";
import type { AuthSession, AuthUser } from "@/types/auth";

export interface AuthEndpoints {
  login: string;
  logout: string;
  currentUser: string;
  refresh?: string;
}

export function createAuthService(endpoints: AuthEndpoints) {
  return {
    async login(credentials: Record<string, string>): Promise<AuthSession> {
      const { data } = await apiClient.post<ApiEnvelope<AuthSession>>(endpoints.login, credentials);
      return data.data;
    },
    async logout(config?: AxiosRequestConfig): Promise<void> { await apiClient.post(endpoints.logout, undefined, config); },
    async currentUser(): Promise<AuthUser> {
      const { data } = await apiClient.get<ApiEnvelope<AuthUser>>(endpoints.currentUser);
      return data.data;
    },
    installRefreshHandler(onRefresh: (session: AuthSession) => void) {
      const refreshEndpoint = endpoints.refresh;
      configureTokenRefresh(refreshEndpoint ? async () => {
        const { data } = await apiClient.post<ApiEnvelope<AuthSession>>(refreshEndpoint);
        onRefresh(data.data);
        return data.data.accessToken;
      } : null);
    },
  };
}
