import { apiClient, getApiAccessToken, getApiSessionEpoch, setApiAccessToken } from "@/services/api/api-client";
import { normalizeAuthenticatedUser } from "./auth-normalizer";
import type { AuthMeResponse, AuthUser, LoginCredentials, LoginResponse, RefreshResponse, SignInScope, SignInResult, AuthChallenge } from "@/types/auth";
export { normalizeAuthenticatedUser } from "./auth-normalizer";

async function resolveResponse(status: number, response: LoginResponse & { data: Record<string, unknown> }, scope: SignInScope): Promise<SignInResult> {
  if (status === 202) {
    const d = response.data;
    const activation = typeof d.activation_token === "string";
    const secret = activation ? d.activation_token : d.challenge_token;
    if (d.authenticated !== false || typeof d.challenge_id !== "string" || typeof secret !== "string" || typeof d.expires_in !== "number" || d.expires_in <= 0) throw new Error("Invalid authentication challenge");
    setApiAccessToken(null);
    return { kind: "challenge", challenge: { kind: activation ? "activation" : "otp", scope, challengeId: d.challenge_id, secret, expiresAt: Date.now() + d.expires_in * 1000 } };
  }
  const token = response.data?.token ?? response.token;
  if (typeof token !== "string" || !token) throw new Error("Missing authentication token");
  setApiAccessToken(token);
  const epoch = getApiSessionEpoch();
  try {
    const user = await authService.me();
    if (user.scope !== scope || user.passwordResetRequired) throw new Error("Authentication scope or activation mismatch");
    return { kind: "authenticated", session: { user, accessToken: getApiAccessToken() ?? token } };
  } catch (error) { if (epoch === getApiSessionEpoch()) setApiAccessToken(null); throw error; }
}

export const authService = {
  async login(credentials: LoginCredentials, scope: SignInScope = "school"): Promise<SignInResult> {
    const result = await apiClient.post(scope === "platform" ? "/platform/auth/login" : "/auth/login", scope === "platform" ? { identifier: credentials.username, password: credentials.password } : credentials, { skipAuthRefresh: true });
    return resolveResponse(result.status, result.data, scope);
  },
  async continueChallenge(challenge: AuthChallenge, values: { otp?: string; password?: string; password_confirmation?: string }): Promise<SignInResult> {
    if (Date.now() >= challenge.expiresAt) throw new Error("Verification expired. Please sign in again.");
    const prefix = challenge.scope === "platform" ? "/platform/auth" : "/auth/first-login";
    const body = challenge.kind === "otp" ? { challenge_id: challenge.challengeId, challenge_token: challenge.secret, otp: values.otp } : { challenge_id: challenge.challengeId, activation_token: challenge.secret, password: values.password, password_confirmation: values.password_confirmation };
    const result = await apiClient.post(`${prefix}/${challenge.kind === "otp" ? "verify-otp" : "activate"}`, body, { skipAuthRefresh: true });
    return resolveResponse(result.status, result.data, challenge.scope);
  },
  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthMeResponse>("/auth/me");
    return normalizeAuthenticatedUser(data.data?.user ?? data.user);
  },
  async logout(): Promise<void> { await apiClient.post("/auth/logout", undefined, { skipAuthRefresh: true, headers: { Authorization: `Bearer ${getApiAccessToken()}` } }); },
  async refresh(): Promise<string> {
    const { data } = await apiClient.post<RefreshResponse>("/auth/refresh", undefined, { skipAuthRefresh: true });
    const token = data.data?.token ?? data.token;
    if (!token) throw new Error("Missing refresh token");
    return token;
  },
};
