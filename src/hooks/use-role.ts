"use client";
import { useAuthStore } from "@/store/auth-store";
export function useRole(role: string) { return useAuthStore((state) => state.hasRole(role)); }
export function useAnyRole(roles: string[]) { return useAuthStore((state) => state.hasAnyRole(roles)); }
