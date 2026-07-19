"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { configureUnauthorizedHandler, setApiAccessToken } from "@/services/api/api-client";
import type { AuthSession, AuthStatus, AuthUser } from "@/types/auth";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  setAuthenticating: () => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  finishHydration: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    status: "hydrating",
    user: null,
    accessToken: null,
    setAuthenticating: () => set({ status: "authenticating" }),
    setSession: ({ user, accessToken }) => {
      setApiAccessToken(accessToken);
      set({ user, accessToken, status: "authenticated" });
    },
    clearSession: () => {
      setApiAccessToken(null);
      set({ user: null, accessToken: null, status: "guest" });
    },
    finishHydration: () => set((state) => state.accessToken ? { status: "authenticated" } : { status: "guest", user: null }),
    hasPermission: (permission) => get().status === "authenticated" && (get().user?.permissions.includes(permission) ?? false),
    hasRole: (role) => get().status === "authenticated" && (get().user?.roles.some((candidate) => candidate.toLowerCase() === role.toLowerCase()) ?? false),
  }),
  {
    name: "shuleos-auth-context",
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ user: state.user }),
    skipHydration: true,
  },
));

configureUnauthorizedHandler(() => useAuthStore.getState().clearSession());
