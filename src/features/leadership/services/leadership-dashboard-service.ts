import { apiClient } from "@/services/api/api-client";
import type { ApiEnvelope, UnknownRecord } from "../../dashboard/dashboard-contract";
import { asRecord, nullableString } from "../../dashboard/dashboard-contract";
import type { LeadershipDashboard } from "../types/dashboard";
export type LeadershipView = "principal" | "deputy" | "hod" | "director";
export function normalizeLeadershipDashboard(value: unknown): LeadershipDashboard {
  const raw = asRecord(value); const view = ["principal", "deputy", "hod", "director"].includes(String(raw.role_view)) ? raw.role_view as LeadershipView : "principal";
  return { roleView: view, academicContext: asRecord(raw.academic_context), widgets: asRecord(raw.widgets), lastRefreshedAt: nullableString(raw.last_refreshed_at) };
}
export const leadershipDashboardService = { async dashboard(view: LeadershipView, signal?: AbortSignal) { const { data } = await apiClient.get<ApiEnvelope<UnknownRecord>>(`/leadership/dashboard/${view}`, { signal }); return normalizeLeadershipDashboard(data.data); } };
