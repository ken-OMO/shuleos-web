import { apiClient } from "@/services/api/api-client";
import type { ApiEnvelope } from "../../dashboard/dashboard-contract";
import type {
  TeacherAssignment,
  TeacherTask,
  TeacherTimetableEntry,
} from "../types/workspace";
import { normalizeTeacherDashboard } from "./teacher-dashboard-normalizer";

export { normalizeTeacherDashboard } from "./teacher-dashboard-normalizer";

export const teacherDashboardService = {
  async dashboard(signal?: AbortSignal) {
    const { data } = await apiClient.get<ApiEnvelope<unknown>>(
      "/teacher/dashboard",
      { signal },
    );

    return normalizeTeacherDashboard(data.data);
  },

  async tasks(signal?: AbortSignal): Promise<TeacherTask[]> {
    const { data } = await apiClient.get<ApiEnvelope<TeacherTask[]>>(
      "/teacher/tasks",
      { signal },
    );

    return data.data ?? [];
  },

  async assignments(signal?: AbortSignal): Promise<TeacherAssignment[]> {
    const { data } = await apiClient.get<ApiEnvelope<TeacherAssignment[]>>(
      "/teacher/assignments",
      { signal, params: { include_upcoming: 1 } },
    );

    return data.data ?? [];
  },

  async timetable(signal?: AbortSignal): Promise<TeacherTimetableEntry[]> {
    const { data } = await apiClient.get<ApiEnvelope<TeacherTimetableEntry[]>>(
      "/teacher/timetable",
      { signal },
    );

    return data.data ?? [];
  },

  async todaysTimetable(
    signal?: AbortSignal,
  ): Promise<TeacherTimetableEntry[]> {
    const { data } = await apiClient.get<ApiEnvelope<TeacherTimetableEntry[]>>(
      "/teacher/timetable/today",
      { signal },
    );

    return data.data ?? [];
  },
};
