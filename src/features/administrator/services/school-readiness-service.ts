import { apiClient } from "@/services/api/api-client";
import { useAuthStore } from "@/store/auth-store";
import { asRecord } from "@/features/dashboard/dashboard-contract";

export interface ReadinessIssue {
  code: string;
  count: number | null;
  names: string[];
}
export interface ReadinessResult {
  complete: boolean | null;
  missing: ReadinessIssue[];
}
export interface SchoolReadiness {
  initial_setup: ReadinessResult;
  academic_configuration: ReadinessResult;
  teaching_coverage: ReadinessResult;
}

export function canReadSchoolReadiness(state = useAuthStore.getState()) {
  return state.status === "authenticated" && state.user?.scope === "school" &&
    Boolean(state.user.school?.id) && state.hasPermission("view_academic_setup_status");
}

function normalizeResult(value: unknown): ReadinessResult {
  const result = asRecord(value);
  // Missing or contradictory data must never look complete.
  if (typeof result.complete !== "boolean" || !Array.isArray(result.missing)) {
    return { complete: null, missing: [] };
  }
  const missing: ReadinessIssue[] = [];
  for (const value of result.missing.slice(0, 50)) {
    const issue = asRecord(value);
    if (typeof issue.code !== "string" || !issue.code.trim()) return { complete: null, missing: [] };
    const count = typeof issue.count === "number" && Number.isSafeInteger(issue.count) && issue.count >= 0 ? issue.count : null;
    const names = (Array.isArray(issue.items) ? issue.items : []).slice(0, 50).flatMap((value) => {
      const item = asRecord(value);
      const name = [item.grade_name, item.stream_name, item.term_name, item.year_name]
        .find((name) => typeof name === "string" && name.trim());
      return typeof name === "string" ? [name] : [];
    });
    missing.push({ code: issue.code, count, names });
  }
  return { complete: result.complete && missing.length > 0 ? null : result.complete, missing };
}

export function normalizeSchoolReadiness(value: unknown, schoolId: string): SchoolReadiness {
  const raw = asRecord(value);
  if (raw.school_id !== schoolId) throw new Error("Readiness response school does not match the active school.");
  return {
    initial_setup: normalizeResult(raw.initial_setup),
    academic_configuration: normalizeResult(raw.academic_configuration),
    teaching_coverage: normalizeResult(raw.teaching_coverage),
  };
}

export async function fetchSchoolReadiness(schoolId: string, signal?: AbortSignal): Promise<SchoolReadiness> {
  if (!canReadSchoolReadiness() || useAuthStore.getState().user?.school?.id !== schoolId) {
    throw Object.assign(new Error("School readiness access is unavailable."), { status: 403 });
  }
  const { data } = await apiClient.get<{ success: boolean; data: unknown }>("/admin/school/readiness", { signal });
  if (data.success !== true) throw new Error("School readiness is unavailable.");
  return normalizeSchoolReadiness(data.data, schoolId);
}
