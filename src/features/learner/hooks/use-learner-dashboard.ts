"use client";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { dashboardRetry } from "../../dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../dashboard/dashboard-query-keys";
import { learnerDashboardService } from "../services/learner-dashboard-service";
export function useLearnerDashboard(){const enabled=useAuthStore((s)=>s.status==="authenticated"&&s.hasPermission("access_learner_portal_phase_two"));return useQuery({queryKey: useScopedQueryKey(dashboardQueryKeys.learner),queryFn:({signal})=>learnerDashboardService.dashboard(signal),enabled,staleTime:60_000,retry:dashboardRetry});}
