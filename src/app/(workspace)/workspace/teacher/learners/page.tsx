"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, DashboardPage, DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || action.mode === "view" || busy || !sameIdentity()) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const url = `${endpoint}/${encodeURIComponent(action.learner.id)}`;
      const response = action.mode === "archive" ? await apiClient.delete(url) : await apiClient.put(url, Object.fromEntries(fields));
      if (!sameIdentity()) return;
      if (response.data.success !== true) throw new Error("Change could not be confirmed.");
      setNotice(action.mode === "archive" ? "Learner archived." : "Learner names updated.");
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
    {action && <form onSubmit={save} className="mb-4 space-y-3 rounded border p-4">
      <h3 className="font-semibold">{action.learner.first_name} {action.learner.last_name}</h3>
      <p>{action.learner.admission_no} · {action.learner.grade} / {action.learner.stream}</p>
      {action.mode === "edit" && <fieldset disabled={busy} className="grid gap-3 md:grid-cols-3">
        <label>First name<Input name="first_name" defaultValue={action.learner.first_name} required maxLength={100} /></label>
        <label>Middle name<Input name="middle_name" defaultValue={action.learner.middle_name ?? ""} maxLength={100} /></label>
        <label>Last name<Input name="last_name" defaultValue={action.learner.last_name} required maxLength={100} /></label>
      </fieldset>}
      {action.mode === "archive" && <p>Archive this learner and remove them from the active roster?</p>}
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2">
        {action.mode !== "view" && <Button type="submit" disabled={busy} variant={action.mode === "archive" ? "destructive" : "default"}>
          {action.mode === "archive" ? "Confirm archive" : "Save names"}
        </Button>}
        <Button type="button" disabled={busy} variant="outline" onClick={() => setAction(null)}>{action.mode === "view" ? "Close" : "Cancel"}</Button>
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
                <Button variant="outline" disabled={busy || !!action} onClick={() => open(learner, "edit")}>Edit names</Button>
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
