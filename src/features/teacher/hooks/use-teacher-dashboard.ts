"use client";

import { useQuery } from "@tanstack/react-query";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { useAuthStore } from "@/store/auth-store";
import { dashboardRetry } from "../../dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../dashboard/dashboard-query-keys";
import { teacherDashboardService } from "../services/teacher-dashboard-service";

export function useTeacherDashboard() {
  const enabled = useAuthStore(
    (state) =>
      state.status === "authenticated" &&
      state.hasPermission("access_teacher_portal"),
  );
  const queryKey = useScopedQueryKey(dashboardQueryKeys.teacher.dashboard);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => teacherDashboardService.dashboard(signal),
    enabled,
    staleTime: 60_000,
    retry: dashboardRetry,
  });
}

export function useTeacherTasks() {
  const enabled = useAuthStore(
    (state) =>
      state.status === "authenticated" &&
      state.hasPermission("access_teacher_portal"),
  );
  const queryKey = useScopedQueryKey(dashboardQueryKeys.teacher.tasks);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => teacherDashboardService.tasks(signal),
    enabled,
    staleTime: 60_000,
    retry: dashboardRetry,
  });
}

export function useTeacherAssignments() {
  const enabled = useAuthStore(
    (state) =>
      state.status === "authenticated" &&
      state.hasPermission("view_own_teacher_assignments"),
  );
  const queryKey = useScopedQueryKey(dashboardQueryKeys.teacher.assignments);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => teacherDashboardService.assignments(signal),
    enabled,
    staleTime: 60_000,
    retry: dashboardRetry,
  });
}

export function useTeacherTimetable() {
  const enabled = useAuthStore(
    (state) =>
      state.status === "authenticated" &&
      state.hasPermission("view_own_timetable"),
  );
  const queryKey = useScopedQueryKey(dashboardQueryKeys.teacher.timetable);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => teacherDashboardService.timetable(signal),
    enabled,
    staleTime: 60_000,
    retry: dashboardRetry,
  });
}

export function useTeacherTodaysTimetable() {
  const enabled = useAuthStore(
    (state) =>
      state.status === "authenticated" &&
      state.hasPermission("view_own_timetable"),
  );
  const queryKey = useScopedQueryKey(dashboardQueryKeys.teacher.todaysTimetable);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => teacherDashboardService.todaysTimetable(signal),
    enabled,
    staleTime: 60_000,
    retry: dashboardRetry,
  });
}
