import { apiClient } from "@/services/api/api-client";
import type { ApiEnvelope, UnknownRecord } from "../../dashboard/dashboard-contract";
import { normalizeTeacherDashboard } from "./teacher-dashboard-normalizer";
export { normalizeTeacherDashboard } from "./teacher-dashboard-normalizer";
export const teacherDashboardService = { async dashboard(signal?: AbortSignal) { const { data } = await apiClient.get<ApiEnvelope<UnknownRecord>>("/teacher/dashboard", { signal }); return normalizeTeacherDashboard(data.data); }, async tasks(signal?: AbortSignal) { return (await apiClient.get<ApiEnvelope<UnknownRecord[]>>("/teacher/tasks", { signal })).data.data ?? []; } };
