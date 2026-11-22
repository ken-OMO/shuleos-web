"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api/api-error";
import { DashboardHeader, DashboardPage, DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard-query-keys";
import { asRecord, dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { apiClient } from "@/services/api/api-client";
import { useAuthStore } from "@/store/auth-store";

type Resource = "academic-years" | "terms";
type CalendarEntry = {
  id: string;
  name: string;
  start: string;
  end: string;
  active: boolean;
  yearId?: string;
};

function canManageCalendar(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school"
    && Boolean(state.user.school?.id)
    && state.hasAnyRole(["Headteacher", "Principal"])
    && state.hasPermission("access_school_leadership_portal")
    && state.hasPermission("manage_academics");
}

function assertSchool(schoolId: string) {
  const state = useAuthStore.getState();
  if (!canManageCalendar(state) || state.user?.school?.id !== schoolId) {
    throw new Error("Academic setup is unavailable.");
  }
}

function calendarDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) ? value.slice(0, 10) : "";
}

async function listEntries(resource: Resource, schoolId: string, signal: AbortSignal): Promise<CalendarEntry[]> {
  assertSchool(schoolId);
  const { data } = await apiClient.get('/' + resource, { signal });
  assertSchool(schoolId);
  if (data.success !== true || !Array.isArray(data.data)) throw new Error("Calendar records are unavailable.");

  return data.data.map((value: unknown) => {
    const row = asRecord(value);
    const isTerm = resource === "terms";
    const name = isTerm ? row.term_name : row.year_name;
    const owner = isTerm ? row.school_id : asRecord(row.school).id;
    if (owner !== schoolId || typeof row.id !== "string" || typeof name !== "string"
      || typeof row.active !== "boolean" || (isTerm && typeof row.academic_year_id !== "string")) {
      throw new Error("An invalid calendar record was returned.");
    }
    return {
      id: row.id, name, active: row.active, start: calendarDate(row.start_date),
      end: calendarDate(row.end_date), yearId: typeof row.academic_year_id === "string" ? row.academic_year_id : undefined,
    };
  });
}

function saveError(error: unknown) {
  if (error instanceof ApiError && error.status === 422) {
    const fields = error.validationErrors;
    const messages = Object.values(fields).flatMap((value) => Array.isArray(value) ? value : [])
      .filter((value): value is string => typeof value === "string");
    return messages.join(" ") || "Review the calendar details and try again.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "Changes are unavailable. Check your permissions and school subscription status.";
  }
  return "The save could not be confirmed. Refresh the list before trying again.";
}

function CalendarSection({ resource, schoolId, years = [] }: {
  resource: Resource;
  schoolId: string;
  years?: CalendarEntry[];
}) {
  const isTerm = resource === "terms";
  const label = isTerm ? "Term" : "Academic year";
  const client = useQueryClient();
  const queryKey = useScopedQueryKey(["school", "academic-setup", resource]);
  const readinessKey = useScopedQueryKey(dashboardQueryKeys.administrator.readiness);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => listEntries(resource, schoolId, signal),
    retry: dashboardRetry,
  });
  const [editing, setEditing] = useState<CalendarEntry | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function reset(entry: CalendarEntry | null = null) {
    setEditing(entry);
    setFormVersion((version) => version + 1);
    setError("");
    setNotice("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const start = String(form.get("start") ?? "");
    const end = String(form.get("end") ?? "");
    if (!name || !start || !end || end <= start) {
      setError("Enter a name and an end date after the start date.");
      return;
    }
    const yearId = editing?.yearId ?? String(form.get("year") ?? "");
    const year = years.find((entry) => entry.id === yearId);
    if (isTerm && (!year || !year.start || !year.end || start < year.start || end > year.end)) {
      setError("Term dates must fall within the selected academic year.");
      return;
    }

    const payload = {
      [isTerm ? "term_name" : "year_name"]: name,
      start_date: start,
      end_date: end,
      active: form.get("active") === "on",
      ...(isTerm && !editing ? { academic_year_id: yearId } : {}),
    };
    const endpoint = "/" + resource;
    setSaving(true);
    try {
      assertSchool(schoolId);
      const response = editing
        ? await apiClient.put(endpoint + "/" + encodeURIComponent(editing.id), payload)
        : await apiClient.post(endpoint, payload);
      assertSchool(schoolId);
      if (response.data.success !== true) throw new Error("Save unconfirmed.");
      reset();
      setNotice(label + " saved.");
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: readinessKey }),
      ]);
    } catch (failure) {
      setError(saveError(failure));
    } finally {
      setSaving(false);
    }
  }

  return <DashboardSection title={isTerm ? "Terms" : "Academic years"}>
    {query.isPending && <p role="status">Loading records…</p>}
    {query.isError && <div role="alert" className="space-y-2">
      <p>Calendar records could not be loaded.</p>
      <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
    </div>}
    {query.isSuccess && <>
      {query.data.length === 0 && <p>No records yet.</p>}
      <ul className="divide-y">
        {query.data.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <p className="font-medium">{entry.name}</p>
            <p className="text-sm text-muted-foreground">
              {[years.find((year) => year.id === entry.yearId)?.name, entry.start, entry.end, entry.active ? "Active" : "Inactive"].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Button variant="outline" disabled={saving} onClick={() => reset(entry)} aria-label={"Edit " + entry.name}>Edit</Button>
        </li>)}
      </ul>
      <form key={formVersion} onSubmit={(event) => void save(event)} className="mt-4 space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">{editing ? "Edit " : "Add "}{label.toLowerCase()}</h3>
        {isTerm && years.length === 0 && <p>Add an academic year before creating a term.</p>}
        <fieldset disabled={saving || (isTerm && years.length === 0)} className="space-y-3">
          {isTerm && !editing && <label className="grid gap-1 text-sm">Academic year
            <select name="year" defaultValue="" required className="rounded-md border bg-background p-2">
              <option value="" disabled>Select a year</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </label>}
          <label className="grid gap-1 text-sm">{label} name
            <Input name="name" defaultValue={editing?.name} maxLength={isTerm ? 50 : 20} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">Start date<Input type="date" name="start" defaultValue={editing?.start} required /></label>
            <label className="grid gap-1 text-sm">End date<Input type="date" name="end" defaultValue={editing?.end} required /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Active</label>
          <div className="flex gap-2">
            <Button type="submit">{saving ? "Saving…" : "Save " + label.toLowerCase()}</Button>
            {editing && <Button type="button" variant="outline" onClick={() => reset()}>Cancel</Button>}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
      {notice && <p role="status" className="mt-2 text-sm">{notice}</p>}
    </>}
  </DashboardSection>;
}

function AcademicCalendar({ schoolId }: { schoolId: string }) {
  const years = useQuery({
    queryKey: useScopedQueryKey(["school", "academic-setup", "academic-years"]),
    queryFn: ({ signal }) => listEntries("academic-years", schoolId, signal),
    retry: dashboardRetry,
  });
  return <>
    <CalendarSection resource="academic-years" schoolId={schoolId} />
    {years.isSuccess && <CalendarSection resource="terms" schoolId={schoolId} years={years.data} />}
  </>;
}

export default function AcademicSetupPage() {
  const allowed = useAuthStore(canManageCalendar);
  const schoolId = useAuthStore((state) => state.user?.school?.id);
  return <DashboardPage>
    <DashboardHeader title="Academic setup" role="School leadership" description="Manage your school’s academic years and terms." />
    <Link href="/workspace/leadership" className="text-sm font-medium text-primary underline">Back to school leadership</Link>
    {allowed && schoolId ? <AcademicCalendar key={schoolId} schoolId={schoolId} /> : <p role="alert">Academic setup access is unavailable.</p>}
  </DashboardPage>;
}
