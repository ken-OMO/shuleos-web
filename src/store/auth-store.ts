"use client";

import { create } from "zustand";
import { configureTokenRefresh, configureUnauthorizedHandler, getApiAccessToken, setApiAccessToken } from "@/services/api/api-client";
import { clearAuthenticatedQueryCache } from "@/services/auth/auth-cache";
import { authService } from "@/services/auth/auth-service";
import { authenticatedSnapshot, canAuthorize, clearedSnapshot, initialAuthSnapshot } from "@/services/auth/auth-state";
import type { AuthPermission, AuthRole, AuthSchool, AuthStatus, AuthUser, LoginCredentials, AuthChallenge, SignInScope, SignInResult } from "@/types/auth";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  school: AuthSchool | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
  accessToken: string | null;
  challenge: AuthChallenge | null;
  login: (credentials: LoginCredentials, scope?: SignInScope) => Promise<SignInResult>;
  continueChallenge: (values: { otp?: string; password?: string; password_confirmation?: string }) => Promise<SignInResult>;
  cancelChallenge: () => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => Promise<void>;
  replaceAccessToken: (token: string) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

let authGeneration = 0;
let hydrationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...initialAuthSnapshot,
  challenge: null,
  cancelChallenge: () => { authGeneration += 1; setApiAccessToken(null); set({ ...clearedSnapshot("guest"), challenge: null }); },
  continueChallenge: async (values) => {
    const generation = authGeneration;
    const challenge = get().challenge;
    if (!challenge) throw new Error("Please sign in again.");
    const result = await authService.continueChallenge(challenge, values);
    if (generation !== authGeneration) throw new Error("Session changed");
    if (result.kind === "authenticated") set({ ...authenticatedSnapshot(result.session.user, result.session.accessToken), challenge: null });
    else set({ challenge: result.challenge });
    return result;
  },
  login: async (credentials, scope = "school") => {
    const generation = ++authGeneration;
    set({ ...clearedSnapshot("guest"), challenge: null, status: "hydrating" });
    setApiAccessToken(null);
    await clearAuthenticatedQueryCache();
    if (generation !== authGeneration) throw new Error("Session changed");
    try {
      const result = await authService.login(credentials, scope);
      if (generation !== authGeneration) throw new Error("Session changed");
      if (result.kind === "authenticated") set(authenticatedSnapshot(result.session.user, result.session.accessToken));
      else set({ ...clearedSnapshot("guest"), challenge: result.challenge });
      return result;
    } catch (error) {
      if (generation !== authGeneration) throw error;
      setApiAccessToken(null);
      set({ ...clearedSnapshot("guest"), challenge: null });
      throw error;
    }
  },
  hydrate: async () => {
    if (get().status !== "idle" || hydrationPromise) return hydrationPromise ?? Promise.resolve();
    const generation = authGeneration;
    const token = getApiAccessToken();
    if (!token) {
      set({ ...clearedSnapshot("guest"), challenge: null });
      return;
    }
    set({ status: "hydrating" });
    hydrationPromise = authService.me().then((user) => { if (generation === authGeneration) set(authenticatedSnapshot(user, getApiAccessToken() ?? token)); }).catch(async () => {
      if (generation !== authGeneration) return;
      setApiAccessToken(null);
      set({ ...clearedSnapshot("expired"), challenge: null });
      await clearAuthenticatedQueryCache();
    }).finally(() => { hydrationPromise = null; });
    return hydrationPromise;
  },
  logout: async () => {
    const generation = ++authGeneration;
    const request = (get().accessToken ? authService.logout() : Promise.resolve()).catch(() => undefined);
    setApiAccessToken(null);
    set({ ...clearedSnapshot("guest"), challenge: null });
    await clearAuthenticatedQueryCache();
    try { await request; } catch { /* Always clear local authorization. */ }
    finally { if (generation === authGeneration) setApiAccessToken(null); }
  },
  expireSession: async () => {
    authGeneration += 1;
    setApiAccessToken(null);
    set({ ...clearedSnapshot("expired"), challenge: null });
    await clearAuthenticatedQueryCache();
  },
  replaceAccessToken: (token) => { setApiAccessToken(token); set({ accessToken: token }); },
  hasPermission: (permission) => canAuthorize(get()) && get().permissions.some((claim) => claim.name === permission),
  hasAnyPermission: (permissions) => canAuthorize(get()) && permissions.some((permission) => get().permissions.some((claim) => claim.name === permission)),
  hasRole: (role) => canAuthorize(get()) && get().roles.some((claim) => claim.name?.toLowerCase() === role.toLowerCase()),
  hasAnyRole: (roles) => canAuthorize(get()) && roles.some((role) => get().roles.some((claim) => claim.name?.toLowerCase() === role.toLowerCase())),
}));

configureTokenRefresh(async () => {
  const generation = authGeneration;
  const token = await authService.refresh();
  if (generation !== authGeneration) throw new Error("Session changed");
  useAuthStore.getState().replaceAccessToken(token);
  return token;
});
configureUnauthorizedHandler(() => { void useAuthStore.getState().expireSession(); });
