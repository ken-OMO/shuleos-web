import type { AuthUser } from "../../types/auth.ts";

const landingRules = [
  { roles: ["Platform Owner", "Platform Super Administrator", "School Admin", "Administrator"], path: "/workspace/admin" },
  { roles: ["Principal", "Deputy Principal", "HOD", "Senior Teacher", "Director"], path: "/workspace/leadership" },
  { roles: ["Teacher"], path: "/workspace/teacher" },
  { roles: ["Parent"], path: "/workspace/parent" },
  { roles: ["Learner"], path: "/workspace/learner" },
] as const;

export function authLandingFor(user: AuthUser): string {
  const names = new Set(user.roles.flatMap((role) => role.name ? [role.name.toLowerCase()] : []));
  return landingRules.find((rule) => rule.roles.some((role) => names.has(role.toLowerCase())))?.path ?? "/workspace";
}

export function safeInternalRedirect(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://shuleos.local");
    if (parsed.origin !== "https://shuleos.local" || parsed.pathname === "/login" || parsed.pathname.startsWith("/auth/")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
