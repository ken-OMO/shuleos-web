"use client";
import { useQuery } from "@tanstack/react-query";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { DashboardPage, DashboardHeader, DashboardSection, DashboardUnavailableState } from "@/components/dashboard/dashboard-primitives";
import { officeSummary } from "../services/school-staff-access-service";

export function SchoolOffice() {
  const query = useQuery({ queryKey: useScopedQueryKey(["school", "office"]), queryFn: ({ signal }) => officeSummary(signal), retry: dashboardRetry });
  if (query.isPending) return <p role="status">Loading school office...</p>;
  if (query.isError) return <DashboardUnavailableState title="School office unavailable" onRetry={() => { void query.refetch(); }}/>;
  return <DashboardPage><DashboardHeader title="School office" role="School Secretary" description={query.data.school_name}/><DashboardSection title="Office responsibilities" description="Your office role is active. Admissions, guardian contacts, letters and approved notices will become available as their business forms are released."><p>Business forms are currently on hold.</p><p className="mt-3 text-sm text-muted-foreground">This role does not grant finance, account administration, marks entry or confidential staff, medical and counselling records.</p></DashboardSection></DashboardPage>;
}
