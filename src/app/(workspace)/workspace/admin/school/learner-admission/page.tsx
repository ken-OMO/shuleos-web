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

type Grade = { id: string; grade_name: string; grade_number: number };
type Stream = { id: string; stream_name: string; grade_id: string };
type Group = { id: string; name: string; kind: string; archived_at: string | null };

const groupKinds = { club: "Club", house: "House", society: "Society" };
const selectClass = "block w-full rounded-md border bg-background p-2";
const fields = [
  ["first_name", "First name", 100, true],
  ["middle_name", "Middle name (optional)", 100, false],
  ["last_name", "Last name", 100, true],
  ["admission_no", "Admission number", 50, true],
  ["upi", "UPI (optional)", 50, false],
  ["kemis_no", "KEMIS number (optional)", 50, false],
] as const;

function canAdmit(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school" && state.hasPermission("manage_learners");
}

function AdmissionForm({ schoolId }: { schoolId: string }) {
  const [gradeId, setGradeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const identity = useAuthStore(state => state.user?.id);

  function isCurrentSchool() {
    const state = useAuthStore.getState();
    return canAdmit(state) && state.user?.school?.id === schoolId && state.user?.id === identity;
  }

  async function load<T>(path: string, signal: AbortSignal): Promise<T> {
    if (!isCurrentSchool()) throw new Error("The school session has changed.");
    const { data } = await apiClient.get(path, { signal });
    if (!isCurrentSchool()) throw new Error("The school session has changed.");
    if (data.success !== true || !data.data) throw new Error("Admission choices are unavailable.");
    return data.data;
  }

  const placement = useQuery({
    queryKey: useScopedQueryKey(["learner-admission", "placement"]),
    queryFn: ({ signal }) => load<{ grades: Grade[]; streams: Stream[] }>("/learners/admission-options", signal),
  });
  const groups = useQuery({
    queryKey: useScopedQueryKey(["co-curricular", "groups"]),
    queryFn: ({ signal }) => load<Group[]>("/co-curricular/groups", signal),
    retry: false,
  });

  const grade = placement.data?.grades.find(item => item.id === gradeId);
  const streams = placement.data?.streams.filter(item => item.grade_id === gradeId) ?? [];
  const assessmentRequired = grade != null && Number(grade.grade_number) >= 3 && Number(grade.grade_number) <= 9;
  const activeGroups = groups.isSuccess ? groups.data.filter(group => !group.archived_at) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !isCurrentSchool() || !grade) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const coCurricular = Object.fromEntries(Object.keys(groupKinds).flatMap(kind => {
      const groupId = data.get(kind);
      data.delete(kind);
      return activeGroups.some(group => group.id === groupId && group.kind === kind) ? [[kind, groupId]] : [];
    }));
    const details = Object.fromEntries([...data].map(([key, value]) => [key, String(value).trim() || null]));
    if (!streams.some(stream => stream.id === details.stream_id)) return;

    submitting.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await apiClient.post("/learners", {
        ...details,
        ...(Object.keys(coCurricular).length ? { co_curricular: coCurricular } : {}),
      });
      if (!isCurrentSchool()) return;
      form.reset();
      setGradeId("");
      setNotice(`${details.first_name} ${details.last_name} admitted successfully (admission number ${details.admission_no}).`);
    } catch (failure) {
      if (!isCurrentSchool()) return;
      const apiError = normalizeApiError(failure);
      setError(Object.values(apiError.validationErrors).flat().join(" ") || apiError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (placement.isPending) return <p role="status">Loading grades and streams…</p>;
  if (placement.isError) return <p role="alert">Grades and streams could not be loaded. <Button onClick={() => void placement.refetch()}>Retry</Button></p>;
  if (!placement.data.grades.length) return <p>Set up an active, classified grade and stream in Academic setup before admitting a learner.</p>;

  return <form onSubmit={submit} className="space-y-5">
    {notice && <p role="status">{notice}</p>}
    <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
      <legend className="mb-3 font-semibold">Learner details</legend>
      {fields.map(([name, label, maxLength, required]) => <label key={name}>{label}
        <Input name={name} maxLength={maxLength} required={required} />
      </label>)}
      <label>Gender
        <select name="gender" className={selectClass} required defaultValue="">
          <option value="">Select gender</option>
          <option value="Female">F</option>
          <option value="Male">M</option>
        </select>
      </label>
      <label>Date of birth<Input name="date_of_birth" type="date" required /></label>
      <p className="text-sm text-muted-foreground md:col-span-2">Admission date is set to today when you save.</p>
    </fieldset>
    <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
      <legend className="mb-3 font-semibold">School placement</legend>
      <label>Grade
        <select name="grade_id" className={selectClass} required value={gradeId} onChange={event => setGradeId(event.target.value)}>
          <option value="">Select a grade</option>
          {placement.data.grades.map(item => <option key={item.id} value={item.id}>{item.grade_name}</option>)}
        </select>
      </label>
      <label>Stream
        <select key={gradeId} name="stream_id" className={selectClass} required disabled={!streams.length}>
          <option value="">{grade && !streams.length ? "No active streams for this grade" : "Select a stream"}</option>
          {streams.map(stream => <option key={stream.id} value={stream.id}>{stream.stream_name}</option>)}
        </select>
      </label>
      <label>Mode of study
        <select name="mode_of_study" className={selectClass} required>
          <option value="">Select a mode</option>
          <option value="day_scholar">Day scholar</option>
          <option value="boarder">Boarder</option>
        </select>
      </label>
      <label>Assessment number{assessmentRequired ? " (required for this grade)" : " (optional)"}
        <Input name="assessment_no" maxLength={50} required={assessmentRequired} />
      </label>
    </fieldset>
    {activeGroups.length > 0 && <fieldset disabled={busy} className="grid gap-4 md:grid-cols-3">
      <legend className="mb-3 font-semibold">Co-curricular placement (optional)</legend>
      {Object.entries(groupKinds).map(([kind, label]) => {
        const choices = activeGroups.filter(group => group.kind === kind);
        return choices.length > 0 && <label key={kind}>{label}
          <select name={kind} className={selectClass}>
            <option value="">Unassigned</option>
            {choices.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>;
      })}
    </fieldset>}
    {groups.isError && normalizeApiError(groups.error).status !== 403 &&
      <p role="alert">Co-curricular choices could not be loaded. <Button type="button" variant="outline" onClick={() => void groups.refetch()}>Retry</Button></p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button type="submit" disabled={busy || !streams.length}>{busy ? "Admitting learner…" : "Admit learner"}</Button>
  </form>;
}

export default function LearnerAdmissionPage() {
  const allowed = useAuthStore(canAdmit);
  const user = useAuthStore(state => state.user);
  const schoolId = user?.school?.id;
  return <DashboardPage>
    <DashboardHeader title="Learner admission" role="School" description="Admit a learner and assign their grade and stream." />
    <DashboardSection title="New learner">
      {allowed && schoolId ? <AdmissionForm key={schoolId + ":" + user.id} schoolId={schoolId} /> :
        <p role="alert">Learner admission is unavailable.</p>}
    </DashboardSection>
  </DashboardPage>;
}
