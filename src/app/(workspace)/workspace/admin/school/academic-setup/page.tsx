"use client";

import Link from "next/link";
import { assertSchool, canManageCalendar, loadGradeSetup } from "@/features/leadership/components/grades-by-education-level";
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

function GradeSetup({ schoolId }: { schoolId: string }) {
  const client = useQueryClient();
  const gradeKey = useScopedQueryKey(["school", "academic-setup", "grades"]);
  const levelKey = useScopedQueryKey(["school", "academic-setup", "education-levels"]);
  const readinessKey = useScopedQueryKey(dashboardQueryKeys.administrator.readiness);
  const grades = useQuery({
    queryKey: gradeKey, retry: dashboardRetry,
    queryFn: ({ signal }) => loadGradeSetup("/grades", schoolId, signal),
  });
  const levels = useQuery({
    queryKey: levelKey, retry: dashboardRetry,
    queryFn: ({ signal }) => loadGradeSetup("/grades/education-levels", schoolId, signal),
  });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const options = (levels.data ?? []).flatMap(level =>
    typeof level.id === "string" && typeof level.level_name === "string"
      ? [{ id: level.id, name: level.level_name }] : []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const target = event.currentTarget;
    const form = new FormData(target);
    const name = String(form.get("grade_name") ?? "").trim();
    if (!name) {
      setError("Enter a grade name.");
      return;
    }
    const number = String(form.get("grade_number") ?? "");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      assertSchool(schoolId);
      const values = {
        grade_name: name,
        grade_order: Number(form.get("grade_order")),
        ...(number !== "" ? { grade_number: Number(number) } : {}),
      };
      const response = editing
        ? await apiClient.put("/grades/" + encodeURIComponent(String(editing.id)), { ...values, active: form.get("active") === "on" })
        : await apiClient.post("/grades", { ...values, education_level_id: form.get("education_level_id") });
      assertSchool(schoolId);
      if (response.data.success !== true) throw new Error("Grade save unconfirmed.");
      target.reset();
      setEditing(null);
      setNotice("Grade saved.");
      await Promise.all([
        client.invalidateQueries({ queryKey: gradeKey }),
        client.invalidateQueries({ queryKey: readinessKey }),
      ]);
    } catch (failure) {
      const validation = failure instanceof ApiError && failure.status === 422
        ? Object.values(failure.validationErrors).flat().filter((message) => typeof message === "string").join(" ")
        : "";
      setError(validation || (failure instanceof ApiError && failure.status === 403
        ? "Grade changes are unavailable. Check permissions and subscription status."
        : "The grade save could not be confirmed. Refresh before retrying."));
    } finally {
      setSaving(false);
    }
  }

  return <DashboardSection title="Grades">
    {grades.isPending && <p role="status">Loading grades…</p>}
    {grades.isError && <p role="alert">Grades could not be loaded. <Button variant="outline" onClick={() => void grades.refetch()}>Retry grades</Button></p>}
    {grades.isSuccess && (grades.data.length ? <ul className="divide-y">
      {grades.data.map(grade => <li key={String(grade.id)} className="flex flex-wrap items-center gap-3 py-3">
        <span className="font-medium">{String(grade.grade_name)}</span>{" "}
        <span className="text-sm text-muted-foreground">{String(asRecord(grade.education_level).level_name ?? "")}{grade.active === false ? " · Inactive" : ""}</span>
        <Button type="button" variant="outline" disabled={saving} onClick={() => { setEditing(grade); setError(""); setNotice(""); }} aria-label={"Edit " + String(grade.grade_name)}>Edit</Button>
      </li>)}
    </ul> : <p>No grades yet.</p>)}
    {levels.isPending && <p role="status">Loading education levels…</p>}
    {levels.isError && <p role="alert">Education levels could not be loaded. <Button variant="outline" onClick={() => void levels.refetch()}>Retry education levels</Button></p>}
    {levels.isSuccess && options.length === 0 && <p>No active education levels are available.</p>}
    {grades.isSuccess && (editing || options.length > 0) && <form key={String(editing?.id ?? "new")} onSubmit={save} className="mt-4 space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">{editing ? "Edit grade" : "Add grade"}</h3>
      <fieldset disabled={saving} className="space-y-3">
        {editing ? <p className="text-sm">Education level: {String(asRecord(editing.education_level).level_name ?? "Unavailable")}</p> : <label className="grid gap-1 text-sm">Education level
          <select name="education_level_id" defaultValue="" required className="rounded border bg-background p-2">
            <option value="" disabled>Select an education level</option>
            {options.map(level => <option key={level.id} value={level.id}>{level.name}</option>)}
          </select>
        </label>}
        <label className="grid gap-1 text-sm">Grade name<Input defaultValue={String(editing?.grade_name ?? "")} name="grade_name" maxLength={50} required /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Display order<Input defaultValue={String(editing?.grade_order ?? "")} name="grade_order" type="number" min={1} step={1} required /></label>
          {editing && typeof editing.grade_number === "number" ? <p className="text-sm">Grade number: {editing.grade_number}</p> : <label className="grid gap-1 text-sm">Grade number (optional)<Input name="grade_number" type="number" min={0} max={12} step={1} />
            <span className="text-xs text-muted-foreground">Standard names are classified automatically. For custom names, enter 0 for pre-primary or 1–12 for a numbered grade.</span>
          </label>}
        </div>
        {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editing.active === true} /> Active</label>}
        <div className="flex gap-2">
          <Button type="submit">{saving ? "Saving…" : "Save grade"}</Button>
          {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setError(""); }}>Cancel</Button>}
        </div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </DashboardSection>;
}

function StreamSetup({ schoolId }: { schoolId: string }) {
  const client = useQueryClient();
  const streamKey = useScopedQueryKey(["school", "academic-setup", "streams"]);
  const gradeKey = useScopedQueryKey(["school", "academic-setup", "grades"]);
  const readinessKey = useScopedQueryKey(dashboardQueryKeys.administrator.readiness);
  const grades = useQuery({
    queryKey: gradeKey, retry: dashboardRetry,
    queryFn: ({ signal }) => loadGradeSetup("/grades", schoolId, signal),
  });
  const streams = useQuery({
    queryKey: streamKey, retry: dashboardRetry,
    queryFn: async ({ signal }) => {
      assertSchool(schoolId);
      const { data } = await apiClient.get("/streams", { signal });
      assertSchool(schoolId);
      if (data.success !== true || !Array.isArray(data.data)) throw new Error("Streams are unavailable.");
      return data.data.map(asRecord) as Record<string, unknown>[];
    },
  });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activeGrades = (grades.data ?? []).filter(grade => grade.active === true);

  function selectStream(entry: Record<string, unknown> | null) {
    setEditing(entry);
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const target = event.currentTarget;
    const form = new FormData(target);
    const streamName = String(form.get("stream_name") ?? "").trim();
    setMessage("");
    setError("");
    if (!streamName) {
      setError("Enter a stream name.");
      return;
    }
    const gradeIds = form.getAll("grade_ids").map(String);
    if (!editing && gradeIds.length === 0) {
      setError("Select at least one grade for this stream.");
      return;
    }
    setSaving(true);
    try {
      assertSchool(schoolId);
      const response = editing
        ? await apiClient.put("/streams/" + encodeURIComponent(String(editing.id)), {
          stream_name: streamName, active: form.get("active") === "on",
        })
        : await apiClient.post("/streams", { stream_name: streamName, grade_ids: gradeIds });
      assertSchool(schoolId);
      if (response.data.success !== true) throw new Error("Stream save unconfirmed.");
      target.reset();
      selectStream(null);
      setMessage(editing ? "Stream saved." : `Stream added to ${gradeIds.length} ${gradeIds.length === 1 ? "grade" : "grades"}.`);
      await Promise.all([
        client.invalidateQueries({ queryKey: streamKey }),
        client.invalidateQueries({ queryKey: readinessKey }),
      ]);
    } catch (failure) {
      const validation = failure instanceof ApiError && failure.status === 422
        ? Object.values(failure.validationErrors).flat().filter(value => typeof value === "string").join(" ")
        : "";
      setError(validation || (failure instanceof ApiError && failure.status === 403
        ? "Stream changes are unavailable. Check permissions and subscription status."
        : "The stream save could not be confirmed. Refresh before retrying."));
    } finally {
      setSaving(false);
    }
  }

  return <DashboardSection title="Streams">
    {streams.isPending && <p role="status">Loading streams…</p>}
    {streams.isError && <p role="alert">Streams could not be loaded. <Button variant="outline" onClick={() => void streams.refetch()}>Retry streams</Button></p>}
    {streams.isSuccess && (streams.data.length ? <ul className="divide-y">
      {streams.data.map(stream => <li key={String(stream.id)} className="flex flex-wrap items-center gap-3 py-3">
        <span className="font-medium">{String(stream.stream_name)}</span>
        <span className="text-sm text-muted-foreground">{String(asRecord(stream.grade).grade_name ?? "Grade unavailable")}{stream.active === false ? " · Inactive" : ""}</span>
        <Button type="button" variant="outline" disabled={saving} onClick={() => selectStream(stream)} aria-label={"Edit stream " + String(stream.stream_name)}>Edit</Button>
      </li>)}
    </ul> : <p>No streams yet.</p>)}
    {grades.isSuccess && activeGrades.length === 0 && <p>Add an active grade before creating streams.</p>}
    {streams.isSuccess && (editing || activeGrades.length > 0) && <form key={String(editing?.id ?? "new")} onSubmit={save} className="mt-4 space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">{editing ? "Edit stream" : "Add stream"}</h3>
      <fieldset disabled={saving} className="space-y-3">
        <label className="grid gap-1 text-sm">Stream name<Input name="stream_name" placeholder="e.g. M" defaultValue={String(editing?.stream_name ?? "")} maxLength={50} required /></label>
        {editing ? <p className="text-sm">Grade: {String(asRecord(editing.grade).grade_name ?? "Unavailable")}</p> : <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Which grades use this stream?</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeGrades.map(grade => <label key={String(grade.id)} className="flex items-center gap-2 rounded border p-2 text-sm">
              <input type="checkbox" name="grade_ids" value={String(grade.id)} />
              {String(grade.grade_name)}
            </label>)}
          </div>
        </fieldset>}
        {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editing.active === true} /> Active</label>}
        <div className="flex gap-2">
          <Button type="submit">{saving ? "Saving…" : "Save stream"}</Button>
          {editing && <Button type="button" variant="outline" onClick={() => selectStream(null)}>Cancel</Button>}
        </div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
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
    <GradeSetup schoolId={schoolId} />
    <StreamSetup schoolId={schoolId} />
  </>;
}

export default function AcademicSetupPage() {
  const allowed = useAuthStore(canManageCalendar);
  const schoolId = useAuthStore((state) => state.user?.school?.id);
  return <DashboardPage>
    <DashboardHeader title="Academic setup" role="School leadership" description="Manage your school’s academic years, terms, grades and streams." />
    <Link href="/workspace/leadership" className="text-sm font-medium text-primary underline">Back to school leadership</Link>
    {allowed && schoolId ? <AcademicCalendar key={schoolId} schoolId={schoolId} /> : <p role="alert">Academic setup access is unavailable.</p>}
  </DashboardPage>;
}
