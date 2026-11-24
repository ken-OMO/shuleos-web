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

function SelectField({ name, label, choices, optional, change }: {
  name: string; label: string; choices: Choice[]; optional?: boolean; change?: (value: string) => void;
}) {
  return <label className="grid gap-1">{label}
    <select name={name} required={!optional} onChange={event => change?.(event.target.value)} className="rounded-md border bg-background p-2">
      <option value="">{optional ? "All streams" : "Select " + label.toLowerCase()}</option>
      {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
    </select>
  </label>;
}

function AssignmentForm({ identity, classTeacher }: { identity: string; classTeacher: boolean }) {
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const saving = useRef(false);

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
      const { data } = await apiClient.post(classTeacher ? "/teacher-assignments/class-teacher-appointments" : endpoint, { ...fields, stream_id: fields.stream_id || null });
      if (sameIdentity() && data.success === true) {
        form.reset();
        setGrade("");
        setYear("");
        setNotice(classTeacher ? "Class teacher appointed." : "Learning area assigned.");
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

  if (options.isPending) return <p role="status">Loading assignment choices…</p>;
  if (options.isError) return <p role="alert">Assignment choices could not be loaded. <Button onClick={() => void options.refetch()}>Retry</Button></p>;
  const { teachers, grades, streams, years, terms, areas } = options.data;
  const gradeAreas = areas.filter(item => item.grade_id === grade);
  const yearTerms = terms.filter(item => item.academic_year_id === year);

  return <form className="space-y-4" onSubmit={save}>
    {!teachers.length && <p>Set up a teacher profile in Staff access first.</p>}
    {!classTeacher && !areas.length && <p>Configure learning areas for your grades before assigning a teacher.</p>}
    <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
      <SelectField name="teacher_id" label="Teacher" choices={teachers.map(item => ({ id: item.id, label: `${item.first_name} ${item.last_name}` }))} />
      <SelectField name="academic_year_id" label="Academic year" change={setYear} choices={years.map(item => ({ id: item.id, label: item.year_name }))} />
      <SelectField key={year} name="term_id" label="Term" choices={yearTerms.map(item => ({ id: item.id, label: item.term_name }))} />
      <SelectField name="grade_id" label="Grade" change={setGrade} choices={grades.map(item => ({ id: item.id, label: item.grade_name }))} />
      <SelectField key={grade + ":stream"} name="stream_id" label="Stream" optional={!classTeacher} choices={streams.filter(item => item.grade_id === grade).map(item => ({ id: item.id, label: item.stream_name }))} />
      {!classTeacher && <>
      <SelectField key={grade + ":area"} name="learning_area_id" label="Learning area" choices={gradeAreas.map(item => ({ id: item.id, label: item.learning_area_name }))} />
      <label>Lessons per week<Input name="lessons_per_week" type="number" min={1} max={20} required /></label>
      </>}
      {classTeacher && <label>Temporary cover ends (optional)<Input name="temporary_until" type="date" /></label>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <Button type="submit" disabled={busy || !teachers.length || (!classTeacher && !gradeAreas.length) || !yearTerms.length}>{busy ? "Saving…" : classTeacher ? "Appoint class teacher" : "Assign learning area"}</Button>
  </form>;
}

export function TeachingSetup({ classTeacher = false }: { classTeacher?: boolean }) {
  const allowed = useAuthStore(canAssign);
  const user = useAuthStore(state => state.user);
  const identity = `${user?.school?.id}:${user?.id}`;
  return <DashboardPage>
    <DashboardHeader title={classTeacher ? "Class-teacher appointments" : "Learning-area assignments"} role="School" description={classTeacher ? "Appoint a teacher to oversee a class for a term." : "Assign teachers to learning areas for a grade, stream and term."} />
    <DashboardSection title="New assignment">
      {allowed ? <AssignmentForm key={identity} identity={identity} classTeacher={classTeacher} /> : <p role="alert">Teacher assignments are unavailable for your role.</p>}
    </DashboardSection>
  </DashboardPage>;
}
