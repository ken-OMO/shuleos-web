"use client";

import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, DashboardPage, DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { apiClient } from "@/services/api/api-client";
import { normalizeApiError } from "@/services/api/api-error";
import { useAuthStore } from "@/store/auth-store";

const endpoint = "/teacher/my-learners";
type Learner = {
  id: string; admission_no: string; first_name: string; middle_name: string | null;
  last_name: string; grade: string | null; stream: string | null; can_manage: boolean;
};

const editable = [
  ["admission_no", "Admission number", 50], ["first_name", "First name", 100],
  ["middle_name", "Middle name", 100], ["last_name", "Last name", 100],
  ["gender", "Gender", 20], ["date_of_birth", "Date of birth", 10],
  ["upi", "UPI", 50], ["kemis_no", "KEMIS number", 50], ["assessment_no", "Assessment number", 50],
] as const;
type Details = Record<(typeof editable)[number][0], string | null> & {
  admission_date: string | null; mode_of_study: string | null; lifecycle_status: string | null;
  contacts: { id: string; first_name: string; last_name: string; phone: string; email: string | null;
    relationship: string | null; is_primary_contact: boolean; emergency_contact: boolean }[];
};

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-w-0">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium">{value || "—"}</dd>
  </div>;
}

function LearnerContacts({ contacts }: { contacts: Details["contacts"] }) {
  return <section className="space-y-3">
    <h3 className="text-sm font-semibold">Parent, guardian and emergency contacts</h3>
    {contacts.length ? <ul className="grid gap-3 sm:grid-cols-2">
      {contacts.map(contact => <li key={contact.id} className="min-w-0 rounded-xl border bg-muted/25 p-3 text-sm">
        <p className="break-words font-medium">{contact.first_name} {contact.last_name}</p>
        {contact.relationship && <p className="mt-0.5 capitalize text-muted-foreground">{contact.relationship}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {contact.is_primary_contact && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Primary contact</span>}
          {contact.emergency_contact && <span className="rounded-full border px-2 py-0.5 text-xs font-medium">Emergency contact</span>}
        </div>
        <p className="mt-2 break-words">{contact.phone}</p>
        {contact.email && <p className="break-all text-muted-foreground">{contact.email}</p>}
      </li>)}
    </ul> : <p className="text-sm text-muted-foreground">No active contacts recorded.</p>}
  </section>;
}

function allowed(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school" &&
    state.hasRole("Teacher") && state.hasPermission("access_teacher_portal");
}

function Roster({ identity }: { identity: string }) {
  const editFormId = useId();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ learner: Learner; mode: "view" | "edit" | "archive" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function sameIdentity() {
    const state = useAuthStore.getState();
    return allowed(state) && identity === `${state.user?.school?.id}:${state.user?.id}`;
  }

  const query = useQuery({
    queryKey: useScopedQueryKey(["my-learners", page]),
    queryFn: async ({ signal }): Promise<{ learners: Learner[]; last_page: number }> => {
      if (!sameIdentity()) throw new Error("The school session has changed.");
      const { data } = await apiClient.get(endpoint, { signal, params: { page } });
      if (!sameIdentity() || data.success !== true || !Array.isArray(data.data?.learners)) throw new Error("Roster unavailable.");
      return data.data;
    },
  });

  const detailId = action?.mode !== "archive" && action?.learner.can_manage ? action.learner.id : null;
  const detail = useQuery({
    queryKey: useScopedQueryKey(["my-learner-details", detailId]),
    enabled: detailId !== null,
    staleTime: 0,
    queryFn: async ({ signal }): Promise<Details> => {
      if (!detailId || !sameIdentity()) throw new Error("Learner details unavailable.");
      const { data } = await apiClient.get(`${endpoint}/${encodeURIComponent(detailId)}`, { signal });
      if (!sameIdentity() || data.success !== true || data.data?.id !== detailId) throw new Error("Learner details unavailable.");
      return data.data;
    },
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || action.mode === "view" || busy || !sameIdentity()) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const url = `${endpoint}/${encodeURIComponent(action.learner.id)}`;
      const response = action.mode === "archive" ? await apiClient.delete(url) : await apiClient.put(url, Object.fromEntries([...fields].map(([key, value]) => [key, String(value).trim() || null])));
      if (!sameIdentity()) return;
      if (response.data.success !== true) throw new Error("Change could not be confirmed.");
      setNotice(action.mode === "archive" ? "Learner archived." : "Learner details updated.");
      setAction(null);
      await query.refetch();
    } catch (failure) {
      if (!sameIdentity()) return;
      const problem = normalizeApiError(failure);
      setError(Object.values(problem.validationErrors).flat().join(" ") || problem.message);
    } finally {
      setBusy(false);
    }
  }

  function open(learner: Learner, mode: NonNullable<typeof action>["mode"]) {
    setError("");
    setNotice("");
    setAction({ learner, mode });
  }

  const learner = action?.learner;
  const fullName = [learner?.first_name, learner?.middle_name, learner?.last_name].filter(Boolean).join(" ");
  const editing = action?.mode === "edit";
  const details = !detail.isFetching && !detail.isError ? detail.data : undefined;

  return <>
    {notice && <p role="status">{notice}</p>}
    <Dialog open={action !== null && action.mode !== "archive"} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
      {learner && action?.mode !== "archive" && <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="m-0 shrink-0 border-b px-4 py-4 pr-14 text-left sm:px-6 sm:pr-14">
          <DialogTitle>{editing ? "Edit learner details" : "Learner details"}</DialogTitle>
          <DialogDescription className="break-words">
            <span className="font-medium text-foreground">{fullName}</span>
            <span className="mt-0.5 block">{learner.admission_no} · {[learner.grade, learner.stream].filter(Boolean).join(" / ") || "Unassigned"}</span>
          </DialogDescription>
        </DialogHeader>
        {detailId && <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {detail.isFetching && <p role="status" className="text-sm text-muted-foreground">Loading learner details…</p>}
          {detail.isError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            Learner details are unavailable.
            <Button type="button" variant="outline" onClick={() => void detail.refetch()}>Retry</Button>
          </div>}
          {details && <>
            <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/25 p-4 sm:grid-cols-3">
              <DetailField label="Admission date" value={details.admission_date?.slice(0, 10)} />
              <DetailField label="Mode of study" value={details.mode_of_study?.replaceAll("_", " ").replace(/^./, char => char.toUpperCase())} />
              <DetailField label="Status" value={details.lifecycle_status?.replace(/^./, char => char.toUpperCase())} />
            </dl>
            {editing ? <form id={editFormId} key={learner.id} onSubmit={save}>
              <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3">
                <legend className="mb-3 text-sm font-semibold">Learner information</legend>
                {editable.map(([name, label, maxLength]) => <label key={name} className="min-w-0 space-y-1.5 text-sm">
                  <span className="block font-medium">{label}</span>
                  <Input name={name} type={name === "date_of_birth" ? "date" : "text"}
                    defaultValue={name === "date_of_birth" ? details[name]?.slice(0, 10) : details[name] ?? ""}
                    required={["admission_no", "first_name", "last_name"].includes(name)} maxLength={maxLength} />
                </label>)}
              </fieldset>
              {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            </form> : <section className="space-y-3">
              <h3 className="text-sm font-semibold">Learner information</h3>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {editable.slice(4).map(([name, label]) => <DetailField key={name} label={label}
                  value={name === "date_of_birth" ? details[name]?.slice(0, 10) : details[name]} />)}
              </dl>
            </section>}
            <LearnerContacts contacts={details.contacts} />
          </>}
        </div>}
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>{editing ? "Cancel" : "Close"}</Button>
          {editing && <Button type="submit" form={editFormId} disabled={busy || !details}>{busy ? "Saving…" : "Save changes"}</Button>}
        </div>
      </DialogContent>}
    </Dialog>
    {action?.mode === "archive" && <form onSubmit={save} className="mb-4 space-y-3 rounded border p-4">
      <h3 className="font-semibold">{action.learner.first_name} {action.learner.last_name}</h3>
      <p>{action.learner.admission_no} · {action.learner.grade} / {action.learner.stream}</p>
      <p>Archive this learner and remove them from the active roster?</p>
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} variant="destructive">Confirm archive</Button>
        <Button type="button" disabled={busy} variant="outline" onClick={() => setAction(null)}>Cancel</Button>
      </div>
    </form>}
    {query.isPending ? <p role="status">Loading learners…</p> :
      query.isError ? <p role="alert">Learners could not be loaded. <Button onClick={() => void query.refetch()}>Retry</Button></p> :
      <>
        {query.data.learners.length ? <ul className="divide-y">
          {query.data.learners.map(learner => <li key={learner.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">{learner.first_name} {learner.middle_name} {learner.last_name}</p>
              <p className="text-sm text-muted-foreground">{learner.admission_no} · {learner.grade} / {learner.stream}</p></div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy || !!action} onClick={() => open(learner, "view")}>View</Button>
              {learner.can_manage && <>
                <Button variant="outline" disabled={busy || !!action} onClick={() => open(learner, "edit")}>Edit</Button>
                <Button variant="outline" disabled={busy || !!action} onClick={() => open(learner, "archive")}>Archive</Button>
              </>}
            </div>
          </li>)}
        </ul> : <p>No active learners on this page.</p>}
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1 || !!action} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page} of {query.data.last_page}</span>
          <Button variant="outline" disabled={page >= query.data.last_page || !!action} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </>}
  </>;
}

export default function MyLearnersPage() {
  const canView = useAuthStore(allowed);
  const user = useAuthStore(state => state.user);
  const identity = `${user?.school?.id}:${user?.id}`;
  return <DashboardPage>
    <DashboardHeader title="My learners" role="Teacher" description="Learners from your teaching assignments and class appointments." />
    <DashboardSection title="Learner roster">
      {canView ? <Roster identity={identity} key={identity} /> : <p role="alert">Learner roster unavailable.</p>}
    </DashboardSection>
  </DashboardPage>;
}
