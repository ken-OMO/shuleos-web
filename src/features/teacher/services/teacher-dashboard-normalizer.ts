import type { TeacherDashboard } from "../types/dashboard.ts";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : {};
const records = (value: unknown, limit: number): RecordValue[] => Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null).slice(0, limit) as RecordValue[] : [];
const string = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;

export function normalizeTeacherDashboard(value: unknown): TeacherDashboard {
  const raw = record(value);
  return {
    teacher: record(raw.teacher),
    currentPeriod: record(raw.current_period),
    assignments: records(raw.assignments, 10),
    todaysTimetable: records(raw.todays_timetable, 10),
    analytics: record(raw.analytics),
    announcements: records(raw.announcements, 10),
    communications: records(raw.recent_communications, 10),
    lastRefreshedAt: string(raw.last_refreshed_at),
  };
}
