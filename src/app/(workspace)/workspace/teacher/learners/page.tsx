"use client";

import { useState, type FormEvent } from "react";
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

function allowed(state: ReturnType<typeof useAuthStore.getState>) {
  return state.status === "authenticated" && state.user?.scope === "school" &&
    state.hasRole("Teacher") && state.hasPermission("access_teacher_portal");
}

function Roster({ identity }: { identity: string }) {
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

  return <>
    {notice && <p role="status">{notice}</p>}
    <Dialog open={action !== null && action.mode !== "archive"} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
      {action && action.mode !== "archive" && <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-10">
          <DialogTitle>{action.mode === "edit" ? "Edit learner details" : "Learner details"}</DialogTitle>
          <DialogDescription>{action.learner.admission_no} · {action.learner.grade} / {action.learner.stream}</DialogDescription>
        </DialogHeader>
        {detailId && detail.isFetching && <p role="status">Loading learner details…</p>}
        {detailId && detail.isError && <p role="alert">Learner details are unavailable. <Button onClick={() => void detail.refetch()}>Retry</Button></p>}
        {!detail.isFetching && detail.data && <div className="my-4 space-y-2 text-sm">
          <p>Admission date {detail.data.admission_date?.slice(0, 10) || "—"} · {detail.data.mode_of_study?.replaceAll("_", " ")} · {detail.data.lifecycle_status}</p>
          <h3 className="font-semibold">Parent, guardian and emergency contacts</h3>
          {detail.data.contacts.length ? <ul className="space-y-2">{detail.data.contacts.map(contact => <li key={contact.id}>
            <p>{contact.first_name} {contact.last_name} · {contact.relationship}{contact.is_primary_contact ? " · Primary contact" : ""}{contact.emergency_contact ? " · Emergency contact" : ""}</p>
            <p>{[contact.phone, contact.email].filter(Boolean).join(" · ")}</p>
          </li>)}</ul> : <p>No active contacts recorded.</p>}
        </div>}
        {action.mode === "edit" ? !detail.isFetching && detail.data && <form key={action.learner.id} onSubmit={save} className="mt-4 space-y-3">
          <fieldset disabled={busy} className="grid gap-3">
            {editable.map(([name, label, maxLength]) => <label key={name}>{label}
              <Input name={name} type={name === "date_of_birth" ? "date" : "text"}
                defaultValue={name === "date_of_birth" ? detail.data?.[name]?.slice(0, 10) : detail.data?.[name] ?? ""}
                required={["admission_no", "first_name", "last_name"].includes(name)} maxLength={maxLength} />
            </label>)}
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
            <Button type="button" disabled={busy} variant="outline" onClick={() => setAction(null)}>Cancel</Button>
          </div>
        </form> : <div className="mt-4 space-y-3">
          <p>{[action.learner.first_name, action.learner.middle_name, action.learner.last_name].filter(Boolean).join(" ")}</p>
          {!detail.isFetching && detail.data && <dl className="grid grid-cols-2 gap-2 text-sm">
            {editable.slice(4).map(([name, label]) => <div key={name}><dt>{label}</dt><dd>{name === "date_of_birth" ? detail.data?.[name]?.slice(0, 10) || "—" : detail.data?.[name] || "—"}</dd></div>)}
          </dl>}
          <Button type="button" variant="outline" onClick={() => setAction(null)}>Close</Button>
        </div>}
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
