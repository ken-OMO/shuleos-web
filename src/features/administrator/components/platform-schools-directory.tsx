"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardHeader, DashboardPage, DashboardSection, DashboardUnavailableState } from "@/components/dashboard/dashboard-primitives";
import { useAuthStore } from "@/store/auth-store";
import { usePlatformSchools } from "../hooks/use-platform-schools";
import { canReadPlatformSchools, schoolLifecycleLabels, type PlatformSchoolsDirectory, type SchoolStateFilter } from "../services/platform-schools-service";

function registeredDate(value: string | null): string {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date) : "Unavailable";
}
export function PlatformSchoolsTable({ directory, filtered }: { directory: PlatformSchoolsDirectory; filtered: boolean }) {
  if (!directory.schools.length) return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
    {filtered ? "No schools match this lifecycle status." : "No registered schools were returned."}
  </p>;
  return <ul aria-label="Registered schools" className="divide-y">{directory.schools.map(school => <li key={school.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,2fr)_1fr_1fr]">
    <div className="min-w-0"><h3 className="break-words font-semibold">{school.name}</h3><p className="mt-1 break-words text-xs text-muted-foreground">School code: {school.code ?? "Unavailable"}</p></div>
    <div><p className="text-xs text-muted-foreground">Lifecycle status</p><p className="mt-1 text-sm">{Object.hasOwn(schoolLifecycleLabels, school.lifecycle ?? "") ? schoolLifecycleLabels[school.lifecycle as keyof typeof schoolLifecycleLabels] : "Unknown"}</p></div>
    <div><p className="text-xs text-muted-foreground">Registered</p><p className="mt-1 text-sm">{registeredDate(school.registeredAt)}</p></div>
  </li>)}</ul>;
}

export function PlatformSchoolsDirectoryView() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SchoolStateFilter>("");
  const allowed = useAuthStore(canReadPlatformSchools);
  const query = usePlatformSchools(page, state);
  if (!allowed) return <DashboardUnavailableState title="Access unavailable" description="This directory requires authorized platform access." />;
  return <DashboardPage>
    <DashboardHeader title="Schools" description="Schools registered with ShuleOS and their lifecycle status." role="Platform administrator"
      lastRefreshedAt={query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : null}
      refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    <DashboardSection title="School directory" description="Registration and an Active lifecycle status do not prove current usage. Usage activity is not available in this directory.">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2 text-sm"><label htmlFor="school-lifecycle">Lifecycle status</label>
          <select id="school-lifecycle" className="rounded-lg border bg-background px-3 py-2" value={state}
            onChange={event => { setState(event.target.value as SchoolStateFilter); setPage(1); }}>
            <option value="">All statuses</option>{Object.entries(schoolLifecycleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {query.data && !query.isError && !query.isPending ? <p className="text-sm text-muted-foreground">{state ? "Matching schools" : "Registered schools"}: {query.data.total}</p> : null}
      </div>
      {query.isError ? <DashboardUnavailableState title="School directory unavailable" description="The school list could not be loaded for your current access." onRetry={() => { void query.refetch(); }} />
        : query.isPending ? <p role="status" className="p-5 text-sm text-muted-foreground">Loading schools...</p>
          : <><PlatformSchoolsTable directory={query.data} filtered={state !== ""} />
            <nav aria-label="School directory pages" className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => setPage(value => value - 1)}>Previous</Button>
              <p className="text-sm text-muted-foreground">Page {query.data.page} of {query.data.lastPage}</p>
              <Button variant="outline" disabled={page >= query.data.lastPage || query.isFetching} onClick={() => setPage(value => value + 1)}>Next</Button>
            </nav></>}
    </DashboardSection>
  </DashboardPage>;
}
