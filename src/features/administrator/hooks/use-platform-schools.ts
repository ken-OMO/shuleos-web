"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard-query-keys";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { canReadPlatformSchools, fetchPlatformSchools, type SchoolStateFilter } from "../services/platform-schools-service";

export function usePlatformSchools(page: number, state: SchoolStateFilter) {
  const enabled = useAuthStore(canReadPlatformSchools);
  return useQuery({
    queryKey: useScopedQueryKey(dashboardQueryKeys.administrator.schools(page, state)),
    queryFn: ({ signal }) => fetchPlatformSchools(page, state, signal),
    enabled, staleTime: 60_000, retry: dashboardRetry,
  });
}
