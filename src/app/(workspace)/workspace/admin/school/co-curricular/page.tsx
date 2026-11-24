"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardHeader, DashboardPage, DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { apiClient } from "@/services/api/api-client";
import { normalizeApiError } from "@/services/api/api-error";
import { useAuthStore } from "@/store/auth-store";

const endpoint = "/co-curricular";
const kinds = { club: "Club", house: "House", society: "Society" } as const;
type Kind = keyof typeof kinds;
const groupKinds = Object.keys(kinds) as Kind[];
type Group = { id: string; kind: Kind; name: string; archived_at: string | null };
type Learner = { id: string; first_name: string; last_name: string; admission_no: string };
type Placement = { id: string; kind: Kind; name: string; group_id: string; ended_at: string | null };
const selectClass = "block w-full rounded-md border bg-background p-2";

function Workspace({ schoolId }: { schoolId: string }) {
  const [editing, setEditing] = useState<Group | null>(null);
  const [archiving, setArchiving] = useState<Group | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const groups = useQuery({
    queryKey: useScopedQueryKey(["co-curricular", "groups"]),
    retry: false,
    queryFn: async ({ signal }): Promise<Group[]> => (await apiClient.get(endpoint + "/groups", { signal })).data.data,
  });
  const placements = useQuery({
    queryKey: useScopedQueryKey(["co-curricular", "placements", learner?.id ?? ""]),
    enabled: learner !== null && groups.isSuccess,
    retry: false,
    queryFn: async ({ signal }): Promise<Placement[]> => (await apiClient.get(endpoint + "/learners/" + learner?.id + "/placements", { signal })).data.data,
  });

  async function perform(action: () => Promise<void>) {
    if (busy || useAuthStore.getState().user?.school?.id !== schoolId) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await action();
    } catch (failure) {
      const apiError = normalizeApiError(failure);
      setError(Object.values(apiError.validationErrors).flat().join(" ") || apiError.message);
    } finally {
      setBusy(false);
    }
  }

  function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void perform(async () => {
      const name = String(data.get("name")).trim();
      if (editing) await apiClient.patch(endpoint + "/groups/" + editing.id, { name });
      else await apiClient.post(endpoint + "/groups", { name, kind: data.get("kind") });
      form.reset();
      setEditing(null);
      setNotice("Group saved.");
      await groups.refetch();
    });
  }

  if (groups.isPending) return <p role="status">Loading groups…</p>;
  if (groups.isError) return <p role="alert">{normalizeApiError(groups.error).message} <Button onClick={() => void groups.refetch()}>Retry</Button></p>;

  return <>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <DashboardSection title="Clubs, houses and societies">
      {groups.data.length ? <ul className="divide-y">
        {groups.data.map(group => <li className="flex flex-wrap items-center gap-3 py-3" key={group.id}>
          <span className="font-medium">{group.name}</span><span className="text-sm text-muted-foreground">{kinds[group.kind]}{group.archived_at ? " · Archived" : ""}</span>
          {!group.archived_at && <>
            <Button disabled={busy} variant="outline" onClick={() => { setEditing(group); setArchiving(null); }}>Rename {group.name}</Button>
            <Button disabled={busy} variant="outline" onClick={() => setArchiving(group)}>Archive {group.name}</Button>
          </>}
        </li>)}
      </ul> : <p>No groups yet. Add your school’s first club, house or society.</p>}
      {archiving && <div className="my-3 space-y-2 rounded-md border p-3">
        <p>Archive {archiving.name}? Current placements will end and remain in learner history.</p>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => void perform(async () => {
            await apiClient.post(endpoint + "/groups/" + archiving.id + "/archive");
            setArchiving(null);
            setEditing(null);
            setNotice("Group archived.");
            await groups.refetch();
            if (learner) await placements.refetch();
          })}>Confirm archive</Button>
          <Button disabled={busy} variant="outline" onClick={() => setArchiving(null)}>Cancel</Button>
        </div>
      </div>}
      <form key={editing?.id ?? "new"} onSubmit={saveGroup} className="mt-4 space-y-3 rounded-md border p-4">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="font-semibold">{editing ? "Rename group" : "Add group"}</legend>
          {!editing && <label className="block">Group type<select name="kind" className={selectClass}>
            {groupKinds.map(kind => <option key={kind} value={kind}>{kinds[kind]}</option>)}
          </select></label>}
          <label className="block">Group name<Input name="name" required maxLength={120} defaultValue={editing?.name} /></label>
          <div className="flex gap-2"><Button type="submit">Save group</Button>
            {editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>}
          </div>
        </fieldset>
      </form>
    </DashboardSection>
    <DashboardSection title="Learner placements">
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
        event.preventDefault();
        const admissionNo = new FormData(event.currentTarget).get("admission_no");
        void perform(async () => {
          setLearner(null);
          const { data } = await apiClient.get(endpoint + "/learner", { params: { admission_no: admissionNo } });
          setLearner(data.data);
        });
      }}>
        <label>Admission number<Input name="admission_no" required maxLength={50} disabled={busy} /></label>
        <Button type="submit" disabled={busy}>Find learner</Button>
      </form>
      {learner && <>
        <h3 className="mt-4 font-semibold">{learner.first_name} {learner.last_name} · {learner.admission_no}</h3>
        {placements.isPending && <p role="status">Loading placements…</p>}
        {placements.isError && <p role="alert">Placements unavailable. <Button onClick={() => void placements.refetch()}>Retry</Button></p>}
        {placements.isSuccess && <form key={learner.id + ":" + placements.dataUpdatedAt} className="mt-3 space-y-3" onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const co_curricular = Object.fromEntries(groupKinds.map(kind => [kind, data.get(kind) || null]));
          void perform(async () => {
            await apiClient.put(endpoint + "/learners/" + learner.id + "/placements", { co_curricular });
            setNotice("Placements saved.");
            await placements.refetch();
          });
        }}>
          <fieldset className="grid gap-3 sm:grid-cols-3" disabled={busy}>
            {groupKinds.map(kind => <label key={kind}>{kinds[kind]}
              <select name={kind} className={selectClass} defaultValue={placements.data.find(item => item.kind === kind && !item.ended_at)?.group_id ?? ""}>
                <option value="">Unassigned</option>
                {groups.data.filter(group => group.kind === kind && !group.archived_at)
                  .map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>)}
          </fieldset>
          <Button type="submit" disabled={busy}>Save placements</Button>
          {placements.data.some(item => item.ended_at) && <details><summary>Past placements</summary>
            <ul className="list-disc pl-5">{placements.data.filter(item => item.ended_at).map(item => <li key={item.id}>{kinds[item.kind]} · {item.name}</li>)}</ul>
          </details>}
        </form>}
      </>}
    </DashboardSection>
  </>;
}

export default function CoCurricularPage() {
  const schoolId = useAuthStore(state => state.user?.school?.id);
  const allowed = useAuthStore(state => state.user?.scope === "school" && state.hasPermission("manage_learners"));
  return <DashboardPage>
    <DashboardHeader title="Co-curricular management" role="School" description="Manage school groups and learner placements." />
    {allowed && schoolId ? <Workspace key={schoolId} schoolId={schoolId} /> : <p role="alert">Co-curricular management is unavailable.</p>}
  </DashboardPage>;
}
