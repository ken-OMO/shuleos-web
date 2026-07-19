"use client";
import { useAuthStore } from "@/store/auth-store";
export function usePermission(permission: string) { return useAuthStore((state) => state.hasPermission(permission)); }
export function useAnyPermission(permissions: string[]) { return useAuthStore((state) => state.hasAnyPermission(permissions)); }
