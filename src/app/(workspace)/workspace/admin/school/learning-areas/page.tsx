"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, DashboardPage, DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { apiClient } from "@/services/api/api-client";
import { normalizeApiError } from "@/services/api/api-error";
import { useAuthStore } from "@/store/auth-store";

const endpoint = "/learning-area-allocations/workspace";
const selectClass = "rounded-md border bg-background p-2";
type Options = {
  grades: { id: string; grade_name: string; level_name: string | null }[];
  areas: { id: string; learning_area_name: string }[];
  suggestions?: Record<string, string[]>;
  allocations: { id: string; grade_id: string; learning_area_id: string; lessons_per_week: number; active: boolean }[];
};

function canConfigure(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school" &&
    ((state.hasRole("Headteacher") && state.hasPermission("manage_academics")) ||
      (state.hasRole("School Admin") && state.hasPermission("access_administrator_portal")));
}

function LearningAreaForm({ identity }: { identity: string }) {
  const [gradeId, setGradeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const saving = useRef(false);

  function sameIdentity() {
    const state = useAuthStore.getState();
    return canConfigure(state) && identity === `${state.user?.school?.id}:${state.user?.id}`;
  }

  const query = useQuery({
    queryKey: useScopedQueryKey(["learning-area-setup"]),
    queryFn: async ({ signal }): Promise<Options> => {
      if (!sameIdentity()) throw new Error("The school session has changed.");
      const { data } = await apiClient.get(endpoint, { signal });
      if (!sameIdentity() || data.success !== true) throw new Error("Learning areas could not be loaded.");
      return data.data;
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !sameIdentity()) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await apiClient.post(endpoint, Object.fromEntries(fields));
      if (!sameIdentity()) return;
      if (data.success !== true) throw new Error("The allocation could not be confirmed.");
      form.reset();
      setNotice("Learning area allocated.");
      await query.refetch();
    } catch (failure) {
      if (!sameIdentity()) return;
      const apiError = normalizeApiError(failure);
      setError(Object.values(apiError.validationErrors).flat().join(" ") || apiError.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (query.isPending) return <p role="status">Loading grades and learning areas…</p>;
  if (query.isError) return <p role="alert">Learning areas could not be loaded. <Button onClick={() => void query.refetch()}>Retry</Button></p>;
  const { grades, areas, allocations, suggestions } = query.data;
  const saved = allocations.filter(item => item.grade_id === gradeId);
  const available = areas.filter(area => !saved.some(item => item.learning_area_id === area.id));
  const level = grades.find(item => item.id === gradeId)?.level_name;
  const suggestedIds = new Set(level ? suggestions?.[level] ?? [] : []);
  const suggested = available.filter(area => suggestedIds.has(area.id));
  const additional = available.filter(area => !suggestedIds.has(area.id));

  return <div className="space-y-5">
    <form className="space-y-4" onSubmit={submit}>
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1">Grade
          <select name="grade_id" value={gradeId} onChange={event => { setGradeId(event.target.value); setError(""); setNotice(""); }} required className={selectClass}>
            <option value="">Select a grade</option>
            {grades.map(item => <option key={item.id} value={item.id}>{item.grade_name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">Learning area
          <select key={gradeId} name="learning_area_id" required disabled={!gradeId || !available.length} className={selectClass}>
            <option value="">Select a learning area</option>
            {suggested.length > 0 && <optgroup label={level ?? "Suggested learning areas"}>
              {suggested.map(item => <option key={item.id} value={item.id}>{item.learning_area_name}</option>)}
            </optgroup>}
            {additional.length > 0 && <optgroup label="Additional school choices">
              {additional.map(item => <option key={item.id} value={item.id}>{item.learning_area_name}</option>)}
            </optgroup>}
          </select>
        </label>
        <label className="grid gap-1">Lessons per week<Input name="lessons_per_week" type="number" min={1} max={20} required /></label>
      </fieldset>
      {!grades.length && <p>Set up an active grade first.</p>}
      {gradeId && !available.length && <p>No unallocated learning areas are available for this grade.</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <Button type="submit" disabled={busy || !gradeId || !available.length}>{busy ? "Saving…" : "Allocate learning area"}</Button>
    </form>
    {gradeId && <section className="space-y-2 border-t pt-4">
      <h3 className="font-semibold">Saved learning areas</h3>
      {saved.length ? <ul className="divide-y">{saved.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-x-4 py-2">
        <span>{areas.find(area => area.id === item.learning_area_id)?.learning_area_name ?? "Unavailable learning area"}</span>
        <span>{item.lessons_per_week} per week{item.active ? "" : " · Inactive"}</span>
      </li>)}</ul> : <p>No learning areas allocated to this grade yet.</p>}
    </section>}
  </div>;
}

export default function LearningAreasPage() {
  const allowed = useAuthStore(canConfigure);
  const user = useAuthStore(state => state.user);
  const identity = `${user?.school?.id}:${user?.id}`;
  return <DashboardPage>
    <DashboardHeader title="Learning areas" role="School" description="Allocate learning areas to grades before assigning teachers." />
    <DashboardSection title="Grade allocations">
      {allowed ? <LearningAreaForm key={identity} identity={identity} /> : <p role="alert">Learning-area setup is unavailable for your role.</p>}
    </DashboardSection>
  </DashboardPage>;
}
