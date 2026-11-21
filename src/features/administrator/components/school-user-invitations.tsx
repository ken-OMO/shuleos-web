"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { DashboardPage, DashboardHeader, DashboardSection, DashboardUnavailableState } from "@/components/dashboard/dashboard-primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { invitationOverview, invitationRoles, inviteSchoolUser, resendSchoolInvitation, canInviteSchoolUsers } from "../services/school-user-invitation-service";

export function SchoolUserInvitations() {
  const allowed = useAuthStore(canInviteSchoolUsers);
  const key = useScopedQueryKey(["school", "user-invitations"]);
  const client = useQueryClient();
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [resend, setResend] = useState<{ id: string; email: string } | null>(null);
  const query = useQuery({ queryKey: key, enabled: allowed, retry: dashboardRetry,
    queryFn: async ({ signal }) => { const [overview, roles] = await Promise.all([invitationOverview(signal), invitationRoles(signal)]); return { ...overview, roles }; } });
  if (!allowed) return <DashboardUnavailableState title="Access unavailable" />;
  return <DashboardPage><DashboardHeader title="Invite school users" role="School administrator" description="Invite users to your school using email and a school code." refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    {notice ? <p role="status" className="break-words">{notice}</p> : null}
    {query.isError ? <DashboardUnavailableState title="Invitations unavailable" onRetry={() => { void query.refetch(); }} /> : query.isPending ? <p role="status">Loading invitation access...</p> : <>
      <DashboardSection title="New invitation" description="An effective school subscription is required. Invitations expire after 24 hours. The user must verify an email OTP and set a permanent password before access.">
        <p className="mb-4 text-sm">School code: <strong>{query.data.school_code}</strong></p>
        <form className="max-w-xl space-y-4" onSubmit={async event => {
          event.preventDefault(); if (busy) return;
          const formElement = event.currentTarget, data = new FormData(formElement);
          const value = (name: string) => String(data.get(name) ?? "").trim();
          setBusy(true); setNotice("");
          try { await inviteSchoolUser({ first_name: value("first_name"), last_name: value("last_name"), email: value("email"), role_id: value("role_id") }); formElement.reset(); setNotice("User invitation created. Email delivery has been requested; receipt is not yet confirmed."); }
          catch (error) { setNotice(error instanceof Error ? error.message : "Invitation failed."); }
          finally { await client.invalidateQueries({ queryKey: key }); setBusy(false); }
        }}>
          {[["first_name", "First name"], ["last_name", "Last name"], ["email", "Email / username"]].map(([name, label]) => <div key={name}><label htmlFor={name}>{label}</label><Input id={name} name={name} type={name === "email" ? "email" : "text"} maxLength={100} required disabled={busy} /></div>)}
          <div><label htmlFor="invitation-role">School role</label><select id="invitation-role" name="role_id" required disabled={busy} defaultValue="" className="block w-full rounded border bg-background p-2"><option value="" disabled>Select a permitted role</option>{query.data.roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
          <Button type="submit" disabled={busy || query.data.roles.length === 0}>{busy ? "Saving..." : "Send invitation"}</Button>
        </form>
      </DashboardSection>
      <DashboardSection title="Pending activation" description="Up to 100 pending invitations are shown. Resending rotates temporary credentials and invalidates earlier OTP and activation challenges. A 60-second cooldown applies.">
        {query.data.pending.length ? <ul className="divide-y">{query.data.pending.map(user => <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="break-all">{user.first_name} {user.last_name} — {user.email}</span><Button variant="outline" disabled={busy} onClick={() => setResend({ id: user.id, email: user.email })}>Resend invitation</Button></li>)}</ul> : <p>No pending invitations.</p>}
        {resend ? <div className="mt-4 space-y-3 rounded border p-4"><p className="break-all">Replace the previous invitation for {resend.email}?</p><Button disabled={busy} onClick={async () => { setBusy(true); setNotice(""); try { await resendSchoolInvitation(resend.id); setNotice("Replacement invitation created. Email delivery requested."); setResend(null); } catch (error) { setNotice(error instanceof Error ? error.message : "Resend failed."); } finally { await client.invalidateQueries({ queryKey: key }); setBusy(false); } }}>Confirm resend</Button><Button variant="outline" disabled={busy} onClick={() => setResend(null)}>Cancel</Button></div> : null}
      </DashboardSection>
    </>}
  </DashboardPage>;
}
