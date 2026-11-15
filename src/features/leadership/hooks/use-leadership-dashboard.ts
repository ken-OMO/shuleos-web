"use client";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { dashboardRetry } from "../../dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../dashboard/dashboard-query-keys";
import { leadershipDashboardService, type LeadershipView } from "../services/leadership-dashboard-service";
export function useLeadershipDashboard(view: LeadershipView) { const enabled = useAuthStore((s) => s.status === "authenticated" && s.hasPermission(`view_${view}_dashboard`)); return useQuery({ queryKey: useScopedQueryKey(dashboardQueryKeys.leadership(view)), queryFn: ({ signal }) => leadershipDashboardService.dashboard(view, signal), enabled, staleTime: 60_000, retry: dashboardRetry }); }
