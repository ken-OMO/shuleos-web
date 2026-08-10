import { apiClient } from "@/services/api/api-client";
import type { ApiEnvelope, UnknownRecord } from "../../dashboard/dashboard-contract";
import { asRecord, asRecords, nullableNumber, nullableString } from "../../dashboard/dashboard-contract";
import type { AdministratorDashboard } from "../types/dashboard";

function numberMap(value: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(asRecord(value)).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

export function normalizeAdministratorDashboard(value: unknown): AdministratorDashboard {
  const raw = asRecord(value);
  const platform = raw.scope === "platform";
  return {
    scope: platform ? "platform" : "school",
    school: platform ? null : asRecord(raw.school),
    totalSchools: nullableNumber(raw.total_schools),
    learnerCount: nullableNumber(platform ? raw.total_learners : raw.learner_count),
    teacherCount: nullableNumber(platform ? raw.total_teachers : raw.teacher_count),
    pendingUserActions: nullableNumber(raw.pending_user_actions),
    pendingImports: nullableNumber(raw.pending_imports),
    criticalAlerts: nullableNumber(raw.critical_alerts),
    upcomingExpiries: Array.isArray(raw.upcoming_expiries) ? raw.upcoming_expiries.length : nullableNumber(raw.upcoming_expiries),
    failedProvisioningTasks: Array.isArray(raw.failed_provisioning_tasks) ? raw.failed_provisioning_tasks.length : nullableNumber(raw.failed_provisioning_tasks),
    profileCompleteness: nullableNumber(asRecord(raw.profile_completeness).percentage),
    schoolsByLifecycle: numberMap(raw.schools_by_lifecycle),
    usersByRole: numberMap(platform ? raw.total_users_by_role : raw.active_users_by_role),
    subscription: platform ? null : asRecord(raw.subscription),
    moduleReadiness: Array.isArray(raw.module_readiness) ? asRecords(raw.module_readiness, 30) : Object.entries(asRecord(raw.module_readiness)).map(([key, item]) => ({ key, ...asRecord(item) })),
    recentActivity: asRecords(raw.recent_audit_events, 10),
    systemAlerts: asRecords(platform ? raw.system_alerts : raw.system_notices, 20),
    lastRefreshedAt: nullableString(raw.last_refreshed_at),
  };
}

export const administratorDashboardService = {
  async dashboard(scope: "school" | "platform", signal?: AbortSignal): Promise<AdministratorDashboard> {
    const { data } = await apiClient.get<ApiEnvelope<UnknownRecord>>(`/admin/dashboard/${scope}`, { signal });
    return normalizeAdministratorDashboard(data.data);
  },
  async tasks(signal?: AbortSignal) { return (await apiClient.get<ApiEnvelope<UnknownRecord[]>>("/admin/tasks", { signal })).data.data ?? []; },
  async alerts(signal?: AbortSignal) { return (await apiClient.get<ApiEnvelope<UnknownRecord[]>>("/admin/alerts", { signal })).data.data ?? []; },
  async preferences(signal?: AbortSignal) { return (await apiClient.get<ApiEnvelope<UnknownRecord>>("/admin/preferences", { signal })).data.data; },
};
