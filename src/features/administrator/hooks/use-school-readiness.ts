"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard-query-keys";
import { dashboardRetry } from "@/features/dashboard/dashboard-contract";
import { canReadSchoolReadiness, fetchSchoolReadiness } from "../services/school-readiness-service";

export function useSchoolReadiness() {
  const schoolId = useAuthStore((state) => state.user?.school?.id);
  const enabled = useAuthStore(canReadSchoolReadiness);
  return useQuery({
    queryKey: useScopedQueryKey(dashboardQueryKeys.administrator.readiness),
    queryFn: ({ signal }) => fetchSchoolReadiness(schoolId!, signal),
    enabled,
    staleTime: 60_000,
    retry: dashboardRetry,
  });
}
