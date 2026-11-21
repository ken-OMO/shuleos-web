import { apiClient } from "@/services/api/api-client";
import { useAuthStore } from "@/store/auth-store";
import { asRecord } from "@/features/dashboard/dashboard-contract";

export const schoolLifecycleLabels = {
  onboarding: "Onboarding", trial: "Trial", active: "Active", grace: "Grace period",
  read_only: "Read-only", suspended: "Suspended", locked: "Locked", archived: "Archived",
} as const;
export type SchoolStateFilter = "" | keyof typeof schoolLifecycleLabels;
export const platformSchoolsPermissions = ["access_administrator_portal", "access_platform_administration", "manage_school_lifecycle"];
export interface PlatformSchool {
  id: string; name: string; code: string | null; lifecycle: string | null; registeredAt: string | null;
}
export interface PlatformSchoolsDirectory {
  schools: PlatformSchool[]; page: number; lastPage: number; total: number;
}
export function canReadPlatformSchools(state = useAuthStore.getState()): boolean {
  return state.status === "authenticated" && state.user?.scope === "platform" && state.user.school === null &&
    state.hasAnyRole(["Platform Owner", "Platform Super Administrator"]) && platformSchoolsPermissions.every(state.hasPermission);
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
export function normalizePlatformSchools(value: unknown): PlatformSchoolsDirectory {
  const raw = asRecord(value);
  if (!Array.isArray(raw.data) || raw.data.length > 100 ||
    !Number.isSafeInteger(raw.current_page) || Number(raw.current_page) < 1 ||
    !Number.isSafeInteger(raw.last_page) || Number(raw.last_page) < Number(raw.current_page) ||
    !Number.isSafeInteger(raw.total) || Number(raw.total) < raw.data.length) {
    throw new Error("The school directory response is invalid.");
  }
  const schools = raw.data.map((value): PlatformSchool => {
    const row = asRecord(value);
    const id = text(row.id), name = text(row.school_name);
    if (!id || !name) throw new Error("A school directory record is invalid.");
    return { id, name, code: text(row.school_code), lifecycle: text(row.lifecycle_state), registeredAt: text(row.created_at) };
  });
  return { schools, page: Number(raw.current_page), lastPage: Number(raw.last_page), total: Number(raw.total) };
}
export async function fetchPlatformSchools(page: number, state: SchoolStateFilter, signal?: AbortSignal): Promise<PlatformSchoolsDirectory> {
  if (!canReadPlatformSchools()) throw Object.assign(new Error("Platform school access is unavailable."), { status: 403 });
  if (!Number.isSafeInteger(page) || page < 1 || (state !== "" && !Object.hasOwn(schoolLifecycleLabels, state))) {
    throw Object.assign(new Error("Invalid school directory filter."), { status: 422 });
  }
  const { data } = await apiClient.get<{ success: boolean; data: unknown }>("/admin/platform/schools", {
    signal, params: { page, per_page: 25, ...(state ? { state } : {}) },
  });
  if (data.success !== true) throw new Error("The school directory is unavailable.");
  const directory = normalizePlatformSchools(data.data);
  if (directory.page !== page) throw new Error("The school directory page does not match the request.");
  return directory;
}
