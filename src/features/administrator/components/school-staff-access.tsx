"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { DashboardPage, DashboardHeader, DashboardSection, DashboardUnavailableState } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { canManageStaff, staffAccess, changeStaffRole, type StaffRole } from "../services/school-staff-access-service";

export function SchoolStaffAccess() {
  const user = useAuthStore(state => state.user);
  return <StaffAccessForIdentity key={`${user?.school?.id}:${user?.id}`} />;
}

function StaffAccessForIdentity() {
  const allowed = useAuthStore(canManageStaff), client = useQueryClient();
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [change, setChange] = useState<{ id: string; name: string; role: StaffRole; assigned: boolean } | null>(null);
  const key = useScopedQueryKey(["school", "staff-access", page]);
  const query = useQuery({ queryKey: key, enabled: allowed, retry: dashboardRetry, queryFn: ({ signal }) => staffAccess(page, signal) });
  if (!allowed) return <DashboardUnavailableState title="Staff access unavailable" />;
  return <DashboardPage><DashboardHeader title="Staff access" role="School administrator" description="Assign additional school responsibilities to existing users." onRefresh={() => { void query.refetch(); }} refreshing={query.isFetching}/>
    <p role="status">{notice}</p>
    <DashboardSection title="School responsibilities" description="Headteacher provides academic leadership. School Secretary provides a restricted office workspace; business forms remain on hold. Neither role grants finance or administration access. Separate Director / School Admin access is retained.">
      {query.isError ? <DashboardUnavailableState onRetry={() => { void query.refetch(); }}/> : query.isPending ? <p>Loading staff...</p> : <><ul className="divide-y">{query.data.users.map(user => <li key={user.id} className="space-y-3 py-4"><p>{user.name} · {user.primary_role ?? "No primary role"}</p><div className="flex flex-wrap gap-2">{(["Headteacher", "School Secretary"] as StaffRole[]).map(role => { const assigned = user.additional_roles.includes(role); return <Button key={role} variant="outline" disabled={busy || user.primary_role === role} onClick={() => setChange({ id: user.id, name: user.name, role, assigned: !assigned })}>{user.primary_role === role ? `${role} (primary)` : `${assigned ? "Remove" : "Add"} ${role}`}</Button>; })}</div></li>)}</ul><div className="mt-4 flex items-center justify-between"><Button disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {query.data.last_page}</span><Button disabled={busy || page >= query.data.last_page} onClick={() => setPage(page + 1)}>Next</Button></div></>}
      {change ? <div role="group" aria-label="Confirm role change" className="mt-4 space-y-3 rounded border p-4"><p>{change.assigned ? "Add" : "Remove"} {change.role} for {change.name}? Removal requires the affected user to sign in again. Sign in again after adding your own role to refresh dashboards.</p><Button disabled={busy} onClick={async () => { setBusy(true); setNotice(""); try { await changeStaffRole(change.id, change.role, change.assigned); setChange(null); await client.invalidateQueries({ queryKey: key }); setNotice("Role updated. Sign in again to refresh your own dashboards."); } catch (error) { setNotice(error instanceof Error ? error.message : "Role update failed."); } finally { setBusy(false); } }}>Confirm</Button><Button variant="outline" disabled={busy} onClick={() => setChange(null)}>Cancel</Button></div> : null}
    </DashboardSection></DashboardPage>;
}
