"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { asRecord, dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { apiClient } from "@/services/api/api-client";
import { useAuthStore } from "@/store/auth-store";

export function canManageCalendar(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school"
    && Boolean(state.user.school?.id)
    && state.hasAnyRole(["Headteacher", "Principal"])
    && state.hasPermission("access_school_leadership_portal")
    && state.hasPermission("manage_academics");
}

export function assertSchool(schoolId: string) {
  const state = useAuthStore.getState();
  if (!canManageCalendar(state) || state.user?.school?.id !== schoolId) {
    throw new Error("Academic setup is unavailable.");
  }
}

export async function loadGradeSetup(path: "/grades" | "/grades/education-levels", schoolId: string, signal: AbortSignal) {
  assertSchool(schoolId);
  const { data } = await apiClient.get(path, { signal });
  assertSchool(schoolId);
  if (data.success !== true || !Array.isArray(data.data)) throw new Error("Grade setup data is unavailable.");
  return data.data.map(asRecord) as Record<string, unknown>[];
}

export function GradesByEducationLevel() {
  const allowed = useAuthStore(canManageCalendar);
  const schoolId = useAuthStore(state => state.user?.school?.id);
  const levelKey = useScopedQueryKey(["school", "academic-setup", "education-levels"]);
  const gradeKey = useScopedQueryKey(["school", "academic-setup", "grades"]);
  const levels = useQuery({
    queryKey: levelKey, enabled: allowed && Boolean(schoolId), retry: dashboardRetry,
    queryFn: ({ signal }) => loadGradeSetup("/grades/education-levels", schoolId!, signal),
  });
  const grades = useQuery({
    queryKey: gradeKey, enabled: allowed && Boolean(schoolId), retry: dashboardRetry,
    queryFn: ({ signal }) => loadGradeSetup("/grades", schoolId!, signal),
  });
  if (!allowed || !schoolId) return null;

  const groups = new Map<string, { name: string; grades: string[] }>();
  for (const level of levels.data ?? []) {
    if (typeof level.id === "string" && typeof level.level_name === "string") {
      groups.set(level.id, { name: level.level_name, grades: [] });
    }
  }
  for (const grade of grades.data ?? []) {
    if (grade.active !== true || typeof grade.grade_name !== "string") continue;
    const level = asRecord(grade.education_level);
    const id = typeof level.id === "string" ? level.id : "";
    const name = typeof level.level_name === "string" ? level.level_name : "Education level unavailable";
    const group = groups.get(id) ?? { name, grades: [] };
    group.grades.push(grade.grade_name);
    groups.set(id, group);
  }

  return <DashboardSection title="Grades by education level">
    {levels.isError || grades.isError ? <div role="alert" className="space-y-2">
      <p>Grades could not be loaded.</p>
      <Button variant="outline" onClick={() => { void levels.refetch(); void grades.refetch(); }}>Try again</Button>
    </div> : levels.isPending || grades.isPending ? <p role="status">Loading grades…</p>
      : groups.size === 0 ? <p>No education levels are available.</p>
      : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[...groups].map(([id, group]) => <section key={id} className="rounded-lg border p-4">
          <h3 className="font-medium">{group.name}</h3>
          {group.grades.length ? <ul className="mt-2 space-y-1 text-sm">
            {group.grades.map(name => <li key={name}>{name}</li>)}
          </ul> : <p className="mt-2 text-sm text-muted-foreground">No grades configured</p>}
        </section>)}
      </div>}
  </DashboardSection>;
}
