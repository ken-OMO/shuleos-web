"use client";

import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const currentSchool = useAuthStore((state) => state.school);
  const logout = useAuthStore((state) => state.logout);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
  return {
    status,
    user,
    currentSchool,
    isAuthenticated: status === "authenticated",
    isHydrating: status === "idle" || status === "hydrating",
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    logout,
  };
}
