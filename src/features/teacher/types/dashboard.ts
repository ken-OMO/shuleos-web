import type { UnknownRecord } from "../../dashboard/dashboard-contract.ts";
export interface TeacherDashboard { teacher: UnknownRecord; currentPeriod: UnknownRecord; assignments: UnknownRecord[]; todaysTimetable: UnknownRecord[]; analytics: UnknownRecord; announcements: UnknownRecord[]; communications: UnknownRecord[]; lastRefreshedAt: string | null }
