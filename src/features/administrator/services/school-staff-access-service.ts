import { apiClient } from "@/services/api/api-client";
import { useAuthStore } from "@/store/auth-store";
export type StaffRole = "Headteacher" | "School Secretary";
export const staffPermissions = ["access_administrator_portal", "update_school_users", "assign_school_permissions"];
export function canManageStaff(state = useAuthStore.getState()) {
  return state.status === "authenticated" && state.user?.scope === "school" && Boolean(state.user.school?.id)
    && state.hasAnyRole(["School Admin", "Administrator", "Director", "School Owner"]) && staffPermissions.every(state.hasPermission);
}
export interface StaffMember { id: string; name: string; primary_role: string | null; additional_roles: StaffRole[]; account_status?: "active" | "suspended" | "inactive" }
function school() { if (!canManageStaff()) throw new Error("Staff access unavailable."); return useAuthStore.getState().user!.school!.id; }
export async function staffAccess(page: number, signal?: AbortSignal): Promise<{ users: StaffMember[]; page: number; last_page: number }> {
  const id = school();
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("Invalid page.");
  const { data } = await apiClient.get("/admin/school/staff-access", { params: { page }, signal });
  const raw = data.data;
  if (school() !== id || data.success !== true || raw?.school_id !== id || raw.page !== page || !Number.isSafeInteger(raw.last_page) || raw.last_page < page || !Array.isArray(raw.users) || raw.users.length > 25
    || raw.users.some((row: StaffMember) => !row || typeof row.id !== "string" || typeof row.name !== "string" || !(row.primary_role === null || typeof row.primary_role === "string") || (row.account_status !== undefined && !["active", "suspended", "inactive"].includes(row.account_status)) || !Array.isArray(row.additional_roles) || row.additional_roles.some(role => !["Headteacher", "School Secretary"].includes(role)))) throw new Error("Invalid staff access response.");
  return raw;
}
export async function changeStaffRole(userId: string, role: StaffRole, assigned: boolean) {
  const id = school();
  if (!["Headteacher", "School Secretary"].includes(role)) throw new Error("Unsupported staff role.");
  const { data } = await apiClient.put(`/admin/school/staff-access/${encodeURIComponent(userId)}`, { role, assigned });
  if (school() !== id || data.success !== true || data.data?.school_id !== id || data.data.user_id !== userId || data.data.role !== role || data.data.assigned !== assigned) throw new Error("Role change unconfirmed. Refresh before retrying.");
}
export async function officeSummary(signal?: AbortSignal): Promise<{ school_name: string }> {
  const state = useAuthStore.getState(), id = state.user?.school?.id;
  if (state.status !== "authenticated" || state.user?.scope !== "school" || !id || !state.hasAnyRole(["School Secretary"]) || !["access_school_office", "view_school_office_summary"].every(state.hasPermission)) throw new Error("Office access unavailable.");
  const { data } = await apiClient.get("/school/office", { signal });
  if (data.success !== true || data.data?.school_id !== id || useAuthStore.getState().user?.school?.id !== id || typeof data.data.school_name !== "string" || data.data.business_forms_available !== false) throw new Error("Invalid school office response.");
  return data.data;
}

export async function changeStaffAccountAccess(
  userId: string,
  action: "suspend" | "activate",
  details?: { reason: string; notes?: string; review_on?: string },
) {
  const schoolId = school();
  const state = useAuthStore.getState();
  const actorId = state.user?.id;
  const permission = action === "suspend" ? "suspend_school_users" : "activate_school_users";
  if (userId === actorId || !state.hasPermission(permission)) throw new Error("Account action unavailable.");

  const { data } = await apiClient.post("/admin/users/" + encodeURIComponent(userId) + "/" + action, details);
  if (school() !== schoolId || useAuthStore.getState().user?.id !== actorId
    || data.success !== true || data.data?.id !== userId || data.data.school_id !== schoolId
    || data.data.active !== (action === "activate")) {
    throw new Error("Account change unconfirmed. Refresh before retrying.");
  }
}


export async function setUpTeacher(userId: string, details: { staff_no: string; tsc_no: string }) {
  const schoolId = school();
  const actorId = useAuthStore.getState().user?.id;
  const { data } = await apiClient.put(
    `/admin/school/staff-access/${encodeURIComponent(userId)}/teacher-profile`,
    details,
  );
  if (school() !== schoolId || useAuthStore.getState().user?.id !== actorId || data.success !== true
    || data.data?.school_id !== schoolId || data.data?.user_id !== userId || typeof data.data?.teacher_id !== "string") {
    throw new Error("Teacher setup could not be confirmed.");
  }
}
