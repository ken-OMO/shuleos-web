"use client";

import { create } from "zustand";
import { configureTokenRefresh, configureUnauthorizedHandler, getApiAccessToken, setApiAccessToken } from "@/services/api/api-client";
import { clearAuthenticatedQueryCache } from "@/services/auth/auth-cache";
import { authService } from "@/services/auth/auth-service";
import { authenticatedSnapshot, canAuthorize, clearedSnapshot, initialAuthSnapshot } from "@/services/auth/auth-state";
import type { AuthPermission, AuthRole, AuthSchool, AuthStatus, AuthUser, LoginCredentials } from "@/types/auth";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  school: AuthSchool | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
  accessToken: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => Promise<void>;
  replaceAccessToken: (token: string) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

let hydrationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...initialAuthSnapshot,
  login: async (credentials) => {
    set({ ...clearedSnapshot("guest"), status: "hydrating" });
    try {
      const session = await authService.login(credentials);
      set(authenticatedSnapshot(session.user, session.accessToken));
      return session.user;
    } catch (error) {
      setApiAccessToken(null);
      set(clearedSnapshot("guest"));
      throw error;
    }
  },
  hydrate: async () => {
    if (get().status !== "idle" || hydrationPromise) return hydrationPromise ?? Promise.resolve();
    const token = getApiAccessToken();
    if (!token) {
      set(clearedSnapshot("guest"));
      return;
    }
    set({ status: "hydrating" });
    hydrationPromise = authService.me().then((user) => set(authenticatedSnapshot(user, token))).catch(async () => {
      setApiAccessToken(null);
      set(clearedSnapshot("expired"));
      await clearAuthenticatedQueryCache();
    }).finally(() => { hydrationPromise = null; });
    return hydrationPromise;
  },
  logout: async () => {
    try { if (get().accessToken) await authService.logout(); }
    catch { /* Local cleanup remains authoritative when network logout fails. */ }
    finally {
      setApiAccessToken(null);
      set(clearedSnapshot("guest"));
      await clearAuthenticatedQueryCache();
    }
  },
  expireSession: async () => {
    setApiAccessToken(null);
    set(clearedSnapshot("expired"));
    await clearAuthenticatedQueryCache();
  },
  replaceAccessToken: (token) => { setApiAccessToken(token); set({ accessToken: token }); },
  hasPermission: (permission) => canAuthorize(get()) && get().permissions.some((claim) => claim.name === permission),
  hasAnyPermission: (permissions) => canAuthorize(get()) && permissions.some((permission) => get().permissions.some((claim) => claim.name === permission)),
  hasRole: (role) => canAuthorize(get()) && get().roles.some((claim) => claim.name?.toLowerCase() === role.toLowerCase()),
  hasAnyRole: (roles) => canAuthorize(get()) && roles.some((role) => get().roles.some((claim) => claim.name?.toLowerCase() === role.toLowerCase())),
}));

configureTokenRefresh(async () => {
  const token = await authService.refresh();
  useAuthStore.getState().replaceAccessToken(token);
  return token;
});
configureUnauthorizedHandler(() => { void useAuthStore.getState().expireSession(); });
