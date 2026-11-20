import type { UnknownRecord } from "../../dashboard/dashboard-contract.ts";
export interface LeadershipDashboard { roleView: "principal" | "deputy" | "hod" | "director"; academicContext: UnknownRecord; widgets: UnknownRecord; lastRefreshedAt: string | null }
