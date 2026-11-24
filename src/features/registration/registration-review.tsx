"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { DashboardPage, DashboardHeader, DashboardSection, DashboardUnavailableState } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { canReviewRegistrations, registrationRequests, reviewRegistration, type Registration } from "./registration-service";

export function RegistrationReview() {
  const [status, setStatus] = useState<Registration["status"]>("pending"), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ row: Registration; action: "approve" | "reject" } | null>(null);
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const allowed = useAuthStore(canReviewRegistrations);
  const prefix = useScopedQueryKey(["platform", "registration-requests"]);
  const schoolsKey = useScopedQueryKey(["dashboard", "administrator", "platform-schools"]);
  const client = useQueryClient();
  const query = useQuery({ queryKey: [...prefix, page, status], queryFn: ({ signal }) => registrationRequests(page, status, signal), enabled: allowed, retry: dashboardRetry, staleTime: 30_000 });
  if (!allowed) return <DashboardUnavailableState title="Access unavailable" />;
  return <DashboardPage><DashboardHeader title="School registrations" description="Review applications before school accounts are created." role="Platform administrator" refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    <DashboardSection title="Registration requests" description="Confirm the applicant's authority to represent the school before approval. Approval creates an Onboarding school and starts the existing administrator invitation flow.">
      <label htmlFor="registration-status" className="mr-3 text-sm">Request status</label><select id="registration-status" value={status} disabled={busy} className="rounded-lg border bg-background p-2" onChange={event => { setStatus(event.target.value as Registration["status"]); setPage(1); setSelected(null); }}>
        <option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
      {notice ? <p role="status" className="mt-4 text-sm">{notice}</p> : null}
      {query.isError ? <DashboardUnavailableState title="Requests unavailable" onRetry={() => { void query.refetch(); }} /> : query.isPending ? <p role="status">Loading requests...</p>
        : <><ul className="mt-4 divide-y">{query.data.data.map(row => <li key={row.id} className="space-y-2 py-5">
          <h3 className="break-words font-semibold">{row.school_name}</h3>
          <p className="text-sm">{row.operating_mode.replaceAll("_", " ")} · {row.status}</p>
          <p className="text-sm">Requested package: {row.requested_package_name ?? "None selected"}</p>
          <p className="text-sm">Requested add-ons: {[
            row.trial_boarding && "Boarding",
            row.trial_transport && "Transport",
            row.trial_elections && "Student Council Elections",
          ].filter(Boolean).join(", ") || "None"}</p>
          <p className="break-words text-sm">Administrator: {row.admin_first_name} {row.admin_last_name} · {row.admin_email}</p>
          {[row.email, row.phone, row.physical_address, row.postal_address].filter(Boolean).map((value, index) => <p key={index} className="break-words text-sm text-muted-foreground">{value}</p>)}
          {row.review_reason ? <p className="text-sm">Review reason: {row.review_reason}</p> : null}
          {row.status === "pending" ? <div className="flex gap-3"><Button disabled={busy} onClick={() => { setSelected({ row, action: "approve" }); setReason(""); setNotice(""); }}>Approve request</Button><Button variant="outline" disabled={busy} onClick={() => { setSelected({ row, action: "reject" }); setReason(""); setNotice(""); }}>Reject request</Button></div> : null}
        </li>)}</ul>{query.data.data.length === 0 ? <p className="py-5 text-sm text-muted-foreground">No {status} requests were returned.</p> : null}
          <nav aria-label="Registration pages" className="mt-4 flex items-center justify-between gap-3"><Button variant="outline" disabled={page <= 1 || busy} onClick={() => { setPage(value => value - 1); setSelected(null); }}>Previous</Button><p>Page {page} of {query.data.last_page}</p><Button variant="outline" disabled={page >= query.data.last_page || busy} onClick={() => { setPage(value => value + 1); setSelected(null); }}>Next</Button></nav></>}
      {selected ? <form aria-label="Confirm registration review" className="mt-5 space-y-3 rounded-lg border p-4" onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setNotice("");
        try {
          await reviewRegistration(selected.row.id, selected.action, reason.trim());
          setNotice(selected.action === "approve" ? "Approved. The school account has been created; the administrator invitation uses the existing delivery process." : "Request rejected. No school account was created.");
          setSelected(null); setPage(1);
          await client.invalidateQueries({ queryKey: schoolsKey });
        } catch (error) { setNotice(error instanceof Error ? `${error.message} Refresh requests before retrying.` : "Review outcome is unconfirmed. Refresh requests before retrying."); }
        finally { await client.invalidateQueries({ queryKey: prefix }); setBusy(false); }
      }}><h3 className="font-semibold">{selected.action === "approve" ? "Approve" : "Reject"} {selected.row.school_name}?</h3>
        {selected.action === "approve" ? <p className="break-words text-sm">This creates a school and sends the administrator invitation to {selected.row.admin_email}.</p>
          : <div><label htmlFor="review-reason">Reason for rejection</label><textarea id="review-reason" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} className="mt-2 w-full rounded-lg border bg-background p-2" /></div>}
        <div className="flex gap-3"><Button type="submit" disabled={busy || (selected.action === "reject" && !reason.trim())}>{busy ? "Saving..." : selected.action === "approve" ? "Confirm approval" : "Confirm rejection"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>Cancel</Button></div>
      </form> : null}
    </DashboardSection></DashboardPage>;
}
