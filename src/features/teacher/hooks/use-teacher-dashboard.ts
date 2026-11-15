"use client";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { dashboardRetry } from "../../dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../dashboard/dashboard-query-keys";
import { teacherDashboardService } from "../services/teacher-dashboard-service";
export function useTeacherDashboard() { const enabled = useAuthStore((s) => s.status === "authenticated" && s.hasPermission("access_teacher_portal")); return useQuery({ queryKey: useScopedQueryKey(dashboardQueryKeys.teacher.dashboard), queryFn: ({ signal }) => teacherDashboardService.dashboard(signal), enabled, staleTime: 60_000, retry: dashboardRetry }); }
export function useTeacherTasks() { const enabled = useAuthStore((s) => s.status === "authenticated" && s.hasPermission("access_teacher_portal")); return useQuery({ queryKey: useScopedQueryKey(dashboardQueryKeys.teacher.tasks), queryFn: ({ signal }) => teacherDashboardService.tasks(signal), enabled, staleTime: 60_000, retry: dashboardRetry }); }
