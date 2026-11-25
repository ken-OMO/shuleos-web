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

const endpoint = "/teacher-assignments/workspace";
const appointmentsEndpoint = "/teacher-assignments/class-teacher-appointments";
type Appointment = {
  id: string; active: boolean; teacher: string; grade: string; stream: string; year: string; term: string;
  starts_on: string; ends_on: string; temporary_until: string | null; status: string;
};
type Choice = { id: string; label: string };
type Options = {
  teachers: { id: string; first_name: string; last_name: string }[];
  grades: { id: string; grade_name: string }[];
  streams: { id: string; grade_id: string; stream_name: string }[];
  years: { id: string; year_name: string }[];
  terms: { id: string; academic_year_id: string; term_name: string }[];
  areas: { id: string; grade_id: string; learning_area_name: string }[];
};

function canAssign(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school" &&
    ((state.hasRole("Headteacher") && state.hasPermission("manage_academics")) ||
      (state.hasRole("School Admin") && state.hasPermission("access_administrator_portal")));
}

function SelectField({ name, label, choices, optional, change, initial }: {
  name: string; label: string; choices: Choice[]; optional?: boolean; initial?: string; change?: (value: string) => void;
}) {
  return <label className="grid gap-1">{label}
    <select name={name} defaultValue={initial} required={!optional} onChange={event => change?.(event.target.value)} className="rounded-md border bg-background p-2">
      <option value="">{optional ? "All streams" : "Select " + label.toLowerCase()}</option>
      {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
    </select>
  </label>;
}

function AssignmentForm({ identity, classTeacher, teacherId }: { identity: string; classTeacher: boolean; teacherId?: string }) {
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const saving = useRef(false);
  const [removal, setRemoval] = useState<Appointment | null>(null);

  function sameIdentity() {
    const state = useAuthStore.getState();
    return canAssign(state) && identity === `${state.user?.school?.id}:${state.user?.id}`;
  }

  const options = useQuery({
    queryKey: useScopedQueryKey(["learning-area-assignments"]),
    queryFn: async ({ signal }): Promise<Options> => {
      if (!sameIdentity()) throw new Error("The school session has changed.");
      const { data } = await apiClient.get(endpoint, { signal });
      if (!sameIdentity() || data.success !== true) throw new Error("Assignment choices are unavailable.");
      return data.data;
    },
  });

  const appointments = useQuery({
    queryKey: useScopedQueryKey(["class-teacher-appointments"]),
    enabled: classTeacher,
    queryFn: async ({ signal }): Promise<Appointment[]> => {
      if (!sameIdentity()) throw new Error("The school session has changed.");
      const { data } = await apiClient.get(appointmentsEndpoint, { signal });
      if (!sameIdentity() || data.success !== true || !Array.isArray(data.data)) throw new Error("Saved appointments are unavailable.");
      return data.data;
    },
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !sameIdentity()) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await apiClient.post(classTeacher ? appointmentsEndpoint : endpoint, { ...fields, stream_id: fields.stream_id || null });
      if (sameIdentity() && data.success === true) {
        form.reset();
        setGrade("");
        setYear("");
        setNotice(classTeacher ? "Class teacher appointed." : "Learning area assigned.");
        if (classTeacher) await appointments.refetch();
      }
    } catch (failure) {
      if (!sameIdentity()) return;
      const apiError = normalizeApiError(failure);
      setError(Object.values(apiError.validationErrors).flat().join(" ") || apiError.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function removeAppointment() {
    if (!removal || saving.current || !sameIdentity()) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await apiClient.delete(`${appointmentsEndpoint}/${encodeURIComponent(removal.id)}`);
      if (!sameIdentity()) return;
      if (data.success !== true || data.data?.id !== removal.id || data.data?.active !== false) {
        throw new Error("Removal could not be confirmed. Refresh the list before retrying.");
      }
      setRemoval(null);
      setNotice("Class teacher removed.");
      await appointments.refetch();
    } catch (failure) {
      if (sameIdentity()) setError(normalizeApiError(failure).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (options.isPending) return <p role="status">Loading assignment choices…</p>;
  if (options.isError) return <p role="alert">Assignment choices could not be loaded. <Button onClick={() => void options.refetch()}>Retry</Button></p>;
  const { teachers, grades, streams, years, terms, areas } = options.data;
  const gradeAreas = areas.filter(item => item.grade_id === grade);
  const yearTerms = terms.filter(item => item.academic_year_id === year);

  return <><form className="space-y-4" onSubmit={save}>
    {!teachers.length && <p>Set up a teacher profile in Staff access first.</p>}
    {!classTeacher && !areas.length && <p>Configure learning areas for your grades before assigning a teacher.</p>}
    <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
      <SelectField name="teacher_id" label="Teacher" initial={teachers.some(item => item.id === teacherId) ? teacherId : undefined} choices={teachers.map(item => ({ id: item.id, label: `${item.first_name} ${item.last_name}` }))} />
      <SelectField name="academic_year_id" label="Academic year" change={setYear} choices={years.map(item => ({ id: item.id, label: item.year_name }))} />
      <SelectField key={year} name="term_id" label="Term" choices={yearTerms.map(item => ({ id: item.id, label: item.term_name }))} />
      <SelectField name="grade_id" label="Grade" change={setGrade} choices={grades.map(item => ({ id: item.id, label: item.grade_name }))} />
      <SelectField key={grade + ":stream"} name="stream_id" label="Stream" optional={!classTeacher} choices={streams.filter(item => item.grade_id === grade).map(item => ({ id: item.id, label: item.stream_name }))} />
      {!classTeacher && <>
      <SelectField key={grade + ":area"} name="learning_area_id" label="Learning area" choices={gradeAreas.map(item => ({ id: item.id, label: item.learning_area_name }))} />
      <label>Lessons per week<Input name="lessons_per_week" type="number" min={1} max={20} required /></label>
      </>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <Button type="submit" disabled={busy || removal !== null || !teachers.length || (!classTeacher && !gradeAreas.length) || !yearTerms.length}>{busy ? "Saving…" : classTeacher ? "Appoint class teacher" : "Assign learning area"}</Button>
  </form>
    {classTeacher && <section className="mt-6 space-y-3 border-t pt-4">
      <h3 className="font-semibold">Saved appointments</h3>
      {appointments.isPending && <p role="status">Loading saved appointments…</p>}
      {appointments.isError && <p role="alert">Saved appointments could not be loaded. <Button onClick={() => void appointments.refetch()}>Retry</Button></p>}
      {appointments.isSuccess && (appointments.data.length ? <ul className="divide-y rounded-md border">
        {appointments.data.map(item => <li className="grid gap-1 p-3" key={item.id}>
          <p className="font-medium">{item.teacher} · {item.grade} / {item.stream}</p>
          <p className="text-sm">{item.year} · {item.term} · {item.starts_on} to {item.ends_on}</p>
          <p className="text-sm">{item.temporary_until ? `Temporary cover through ${item.temporary_until}` : "Regular appointment"} · {item.status}</p>
          {item.active && <Button type="button" variant="outline" className="w-fit" disabled={busy || removal !== null}
            onClick={() => { setError(""); setNotice(""); setRemoval(item); }}>Remove class teacher</Button>}
          {removal?.id === item.id && <div role="group" aria-label="Confirm class-teacher removal" className="space-y-2">
            <p>Remove {item.teacher} from {item.grade} / {item.stream}? This ends admission access from this appointment.</p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void removeAppointment()}>Confirm removal</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setRemoval(null)}>Cancel</Button>
            </div>
          </div>}
        </li>)}
      </ul> : <p>No class-teacher appointments saved yet.</p>)}
    </section>}
  </>;
}

export function TeachingSetup({ classTeacher = false, teacherId }: { classTeacher?: boolean; teacherId?: string }) {
  const allowed = useAuthStore(canAssign);
  const user = useAuthStore(state => state.user);
  const identity = `${user?.school?.id}:${user?.id}`;
  return <DashboardPage>
    <DashboardHeader title={classTeacher ? "Class-teacher appointments" : "Learning-area assignments"} role="School" description={classTeacher ? "Appoint a teacher to oversee a class for a term." : "Assign teachers to learning areas for a grade, stream and term."} />
    <DashboardSection title="New assignment">
      {allowed ? <AssignmentForm key={identity} identity={identity} classTeacher={classTeacher} teacherId={teacherId} /> : <p role="alert">Teacher assignments are unavailable for your role.</p>}
    </DashboardSection>
  </DashboardPage>;
}
