"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { DashboardPage, DashboardHeader, DashboardSection, DashboardUnavailableState } from "@/components/dashboard/dashboard-primitives";
import { normalizeApiError } from "@/services/api/api-error";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { canManageStaff, staffAccess, changeStaffRole, changeStaffAccountAccess, setUpTeacher, type StaffMember, type StaffRole } from "../services/school-staff-access-service";

export function SchoolStaffAccess() {
  const user = useAuthStore(state => state.user);
  return <StaffAccessForIdentity key={`${user?.school?.id}:${user?.id}`} />;
}

const suspensionReasons = [
  ["extended_leave", "Extended leave"],
  ["pending_review", "Pending internal review"],
  ["account_compromise", "Suspected account compromise"],
  ["temporary_duty_change", "Temporary change of duties"],
  ["other", "Other"],
] as const;

function StaffAccessForIdentity() {
  const allowed = useAuthStore(canManageStaff), client = useQueryClient();
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [change, setChange] = useState<{ id: string; name: string; role: StaffRole; assigned: boolean } | null>(null);
  const actorId = useAuthStore(state => state.user?.id);
  const canSuspend = useAuthStore(state => state.hasPermission("suspend_school_users"));
  const canActivate = useAuthStore(state => state.hasPermission("activate_school_users"));
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<StaffMember | null>(null);
  const [account, setAccount] = useState<StaffMember | null>(null);
  const [reason, setReason] = useState("");
  const key = useScopedQueryKey(["school", "staff-access", page]);
  const query = useQuery({ queryKey: key, enabled: allowed, retry: dashboardRetry, queryFn: ({ signal }) => staffAccess(page, signal) });
  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || busy) return;
    const form = new FormData(event.currentTarget);
    const notes = String(form.get("notes") ?? "").trim();
    const reviewDate = String(form.get("review") ?? "");
    const suspending = account.account_status === "active";
    if (suspending && (!reason || (reason === "other" && !notes))) {
      setNotice("Choose a reason and enter an explanation if you selected Other.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      await changeStaffAccountAccess(account.id, suspending ? "suspend" : "activate",
        suspending ? { reason, notes: notes || undefined, review_on: reviewDate || undefined } : undefined);
      setAccount(null);
      await client.invalidateQueries({ queryKey: key });
      setNotice(suspending ? "Account suspended." : "Account reactivated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Account change could not be confirmed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teacher || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      const id = await setUpTeacher(teacher.id, {
        staff_no: String(form.get("staff_no")).trim(),
        tsc_no: String(form.get("tsc_no")).trim(),
      });
      setTeacher(null);
      setTeacherId(id);
      setNotice("Teacher profile linked. The teacher can open the Teaching dashboard.");
    } catch (failure) {
      const error = normalizeApiError(failure);
      setNotice(Object.values(error.validationErrors).flat().join(" ") || error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return <DashboardUnavailableState title="Staff access unavailable" />;
  return <DashboardPage><DashboardHeader title="Staff access" role="School administrator" description="Assign additional school responsibilities to existing users." onRefresh={() => { void query.refetch(); }} refreshing={query.isFetching}/>
    <p role="status">{notice}</p>
    {teacherId && <Link className="text-primary underline" href={`/workspace/admin/school/learning-area-assignments?teacher=${encodeURIComponent(teacherId)}`}>Assign this teacher’s learning areas</Link>}
    <DashboardSection title="School responsibilities" description="Headteacher provides academic leadership. School Secretary provides a restricted office workspace; business forms remain on hold. Neither role grants finance or administration access. Separate Director / School Admin access is retained.">
      {query.isError ? <DashboardUnavailableState onRetry={() => { void query.refetch(); }}/> : query.isPending ? <p>Loading staff...</p> : <><ul className="divide-y">{query.data.users.map(user => <li key={user.id} className="space-y-3 py-4"><p>{user.name} · {user.primary_role ?? "No primary role"}</p><div className="flex flex-wrap gap-2">{(["Headteacher", "School Secretary"] as StaffRole[]).map(role => { const assigned = user.additional_roles.includes(role); return <Button key={role} variant="outline" disabled={busy || Boolean(account || teacher) || (user.account_status !== undefined && user.account_status !== "active") || user.primary_role === role} onClick={() => setChange({ id: user.id, name: user.name, role, assigned: !assigned })}>{user.primary_role === role ? `${role} (primary)` : `${assigned ? "Remove" : "Add"} ${role}`}</Button>; })}
        {user.primary_role === "Teacher" && user.account_status === "active" &&
          <Button variant="outline" disabled={busy || Boolean(change || account || teacher)} onClick={() => { setNotice(""); setTeacherId(null); setTeacher(user); }}>Set up teacher</Button>}
        {user.id !== actorId && ((user.account_status === "active" && canSuspend) || (user.account_status === "suspended" && canActivate)) &&
          <Button variant="outline" disabled={busy || Boolean(change || account || teacher)} onClick={() => { setReason(""); setNotice(""); setAccount(user); }}>
            {user.account_status === "active" ? "Suspend account" : "Reactivate account"}
          </Button>}
        {user.account_status === "suspended" && <span className="self-center text-sm text-muted-foreground">Suspended</span>}
      </div></li>)}</ul><div className="mt-4 flex items-center justify-between"><Button disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {query.data.last_page}</span><Button disabled={busy || page >= query.data.last_page} onClick={() => setPage(page + 1)}>Next</Button></div></>}
      {teacher && <form onSubmit={submitTeacher} className="mt-4 space-y-3 rounded border p-4">
        <h3 className="font-semibold">Set up {teacher.name}</h3>
        <p>Enter the staff and TSC numbers to link a matching profile or create one for this login.</p>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
          <label>Staff number<Input name="staff_no" required maxLength={50} /></label>
          <label>TSC number<Input name="tsc_no" required maxLength={50} /></label>
        </fieldset>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>Save teacher profile</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setTeacher(null)}>Cancel</Button>
        </div>
      </form>}
      {account && <form aria-label="Confirm account access change" onSubmit={submitAccount} className="mt-4 space-y-3 rounded border p-4">
        <h3 className="font-semibold">{account.account_status === "active" ? "Temporarily suspend" : "Reactivate"} {account.name}</h3>
        {account.account_status === "active" ? <>
          <p>Review responsibilities before suspending. This account will lose access and its current sessions will end.</p>
          <p>Current roles: {[account.primary_role, ...account.additional_roles].filter(Boolean).join(", ") || "None listed"}.</p>
          <label className="grid gap-1 text-sm">Reason for suspension
            <select value={reason} onChange={event => setReason(event.target.value)} required disabled={busy} className="rounded border bg-background p-2">
              <option value="">Choose a reason</option>
              {suspensionReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">{reason === "other" ? "Explanation (required)" : "Notes (optional)"}
            <textarea name="notes" maxLength={500} required={reason === "other"} disabled={busy} className="rounded border bg-background p-2" />
          </label>
          <label className="grid gap-1 text-sm">Review date (optional)
            <input name="review" type="date" disabled={busy} className="rounded border bg-background p-2" />
          </label>
          <p className="text-sm text-muted-foreground">A review date is recorded for reference. An administrator must reactivate access.</p>
        </> : <p>This allows the user to sign in again with their assigned roles.</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{account.account_status === "active" ? "Confirm suspension" : "Confirm reactivation"}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setAccount(null)}>Cancel</Button>
        </div>
      </form>}
      {change ? <div role="group" aria-label="Confirm role change" className="mt-4 space-y-3 rounded border p-4"><p>{change.assigned ? "Add" : "Remove"} {change.role} for {change.name}? Removal requires the affected user to sign in again. Sign in again after adding your own role to refresh dashboards.</p><Button disabled={busy} onClick={async () => { setBusy(true); setNotice(""); try { await changeStaffRole(change.id, change.role, change.assigned); setChange(null); await client.invalidateQueries({ queryKey: key }); setNotice("Role updated. Sign in again to refresh your own dashboards."); } catch (error) { setNotice(error instanceof Error ? error.message : "Role update failed."); } finally { setBusy(false); } }}>Confirm</Button><Button variant="outline" disabled={busy} onClick={() => setChange(null)}>Cancel</Button></div> : null}
    </DashboardSection></DashboardPage>;
}
