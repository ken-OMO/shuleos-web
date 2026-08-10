import { apiClient } from "@/services/api/api-client";
import type {
  ApiEnvelope,
  UnknownRecord,
} from "../../dashboard/dashboard-contract";
import {
  asRecord,
  asRecords,
  nullableNumber,
  nullableString,
} from "../../dashboard/dashboard-contract";
import type { LearnerDashboard } from "../types/dashboard";

export function normalizeLearnerDashboard(value: unknown): LearnerDashboard {
  const raw = asRecord(value);

  return {
    learner: asRecord(raw.learner),
    academicContext: asRecord(raw.academic_context),
    timetable: asRecords(raw.today_timetable, 12),
    homeworkDue: asRecords(raw.homework_due_soon, 10),
    overdueHomework: asRecords(raw.overdue_homework, 10),
    tasks: asRecords(raw.tasks, 20),
    unreadNotifications: nullableNumber(raw.unread_notifications),
    announcements: asRecords(raw.announcements, 5),
    latestResult: asRecord(raw.latest_result),
    attendance: asRecord(raw.attendance_summary),
    offlineResources: nullableNumber(raw.available_offline_resources),
    lastRefreshedAt: nullableString(raw.last_refreshed_at),
  };
}

export const learnerDashboardService = {
  async dashboard(signal?: AbortSignal): Promise<LearnerDashboard> {
    const { data } = await apiClient.get<ApiEnvelope<LearnerDashboard>>(
      "/learner/dashboard",
      { signal },
    );

    return normalizeLearnerDashboard(data.data);
  },

  async tasks(signal?: AbortSignal): Promise<UnknownRecord[]> {
    const { data } = await apiClient.get<ApiEnvelope<UnknownRecord[]>>(
      "/learner/tasks",
      { signal },
    );

    return data.data ?? [];
  },
};
