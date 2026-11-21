import type { AuthUser } from "../../types/auth.ts";

const landingRules = [
  { roles: ["Platform Owner", "Platform Super Administrator"], path: "/workspace/admin/platform" },
  { roles: ["School Admin", "Administrator", "Director", "School Owner"], path: "/workspace/admin/school" },
  { roles: ["Principal", "Headteacher", "Deputy Principal", "Deputy Headteacher", "HOD", "Senior Teacher", "Finance Officer", "Finance Manager", "Examination Officer", "Discipline Lead", "Timetable Manager"], path: "/workspace/leadership" },
  { roles: ["School Secretary"], path: "/workspace/office" },
  { roles: ["Teacher"], path: "/workspace/teacher" },
  { roles: ["Parent"], path: "/workspace/parent" },
  { roles: ["Learner"], path: "/workspace/learner" },
] as const;

export function authLandingFor(user: AuthUser): string {
  const names = new Set(user.roles.map((role) => role.name.toLowerCase()));
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
