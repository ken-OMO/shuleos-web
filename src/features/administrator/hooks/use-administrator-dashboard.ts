"use client";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { dashboardRetry } from "../../dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../dashboard/dashboard-query-keys";
import { administratorDashboardService } from "../services/administrator-dashboard-service";

export function useAdministratorDashboard(scope: "school" | "platform") {
  const permission = scope === "platform" ? "view_platform_dashboard" : "view_admin_dashboard";
  const enabled = useAuthStore((state) => state.status === "authenticated" && state.hasPermission(permission));
  return useQuery({ queryKey: useScopedQueryKey(dashboardQueryKeys.administrator.dashboard(scope)), queryFn: ({ signal }) => administratorDashboardService.dashboard(scope, signal), enabled, staleTime: 60_000, retry: dashboardRetry });
}

export function useAdministratorTasks() {
  const scope = useAuthStore((state) => state.user?.scope === "platform" ? "platform" : "school");
  const enabled = useAuthStore((state) => state.status === "authenticated" && state.hasPermission("view_admin_tasks"));
  return useQuery({ queryKey: useScopedQueryKey([...dashboardQueryKeys.administrator.tasks, scope]), queryFn: ({ signal }) => administratorDashboardService.tasks(signal, scope), enabled, staleTime: 60_000, retry: dashboardRetry });
}

export function useAdministratorAlerts() {
  const scope = useAuthStore((state) => state.user?.scope === "platform" ? "platform" : "school");
  const enabled = useAuthStore((state) => state.status === "authenticated" && state.hasPermission("view_admin_alerts"));
  return useQuery({ queryKey: useScopedQueryKey([...dashboardQueryKeys.administrator.alerts, scope]), queryFn: ({ signal }) => administratorDashboardService.alerts(signal, scope), enabled, staleTime: 60_000, retry: dashboardRetry });
}

export function useAdministratorPreferences() {
  const enabled = useAuthStore((state) => state.status === "authenticated" && state.hasPermission("manage_admin_preferences"));
  return useQuery({ queryKey: useScopedQueryKey(dashboardQueryKeys.administrator.preferences), queryFn: ({ signal }) => administratorDashboardService.preferences(signal), enabled, staleTime: 300_000, retry: dashboardRetry });
}
