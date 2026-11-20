"use client";
import { useAuthStore } from "@/store/auth-store";
export function useScopedQueryKey(key: readonly unknown[]) {
  const user = useAuthStore((state) => state.user);
  return ["identity", user?.scope ?? "guest", user?.school?.id ?? "platform", user?.id ?? "guest", ...key];
}
