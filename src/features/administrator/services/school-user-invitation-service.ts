import { apiClient } from "@/services/api/api-client";
import { useAuthStore } from "@/store/auth-store";

export const invitationPermissions = ["access_administrator_portal", "create_school_users", "activate_school_users"];
export function canInviteSchoolUsers(state = useAuthStore.getState()) {
  return state.status === "authenticated" && state.user?.scope === "school" && Boolean(state.user.school?.id) &&
    state.hasAnyRole(["School Admin", "Administrator", "Director", "School Owner"]) && invitationPermissions.every(state.hasPermission);
}
export function invitationSchoolId() {
  if (!canInviteSchoolUsers()) throw new Error("School invitation access is unavailable.");
  return useAuthStore.getState().user!.school!.id;
}
const endpoint = "/admin/school/user-invitations";
export interface InvitationInput { first_name: string; last_name: string; email: string; role_id: string }
export interface PendingInvitation { id: string; first_name: string; last_name: string; email: string }
export async function invitationOverview(signal?: AbortSignal): Promise<{ school_code: string; pending: PendingInvitation[] }> {
  const schoolId = invitationSchoolId();
  const { data } = await apiClient.get(endpoint, { signal });
  if (data.success !== true || data.data?.school_id !== schoolId || typeof data.data.school_code !== "string" || !Array.isArray(data.data.pending) || data.data.pending.length > 100 ||
    data.data.pending.some((row: PendingInvitation) => !row || [row.id, row.first_name, row.last_name, row.email].some(value => typeof value !== "string"))) throw new Error("Invalid school invitation response.");
  return data.data;
}
export async function invitationRoles(signal?: AbortSignal): Promise<Array<{ id: string; name: string }>> {
  invitationSchoolId();
  const { data } = await apiClient.get(`${endpoint}/roles`, { signal });
  if (data.success !== true || !Array.isArray(data.data?.roles) || data.data.roles.some((role: { id: string; name: string }) => !role || typeof role.id !== "string" || typeof role.name !== "string")) throw new Error("Invitation roles unavailable.");
  return data.data.roles;
}
export async function inviteSchoolUser(input: InvitationInput) {
  invitationSchoolId();
  const { data } = await apiClient.post(endpoint, { first_name: input.first_name, last_name: input.last_name, email: input.email, role_id: input.role_id });
  if (data.success !== true || typeof data.data?.id !== "string" || data.data.status !== "pending_activation") throw new Error("Invitation outcome unconfirmed. Refresh before retrying.");
}
export async function resendSchoolInvitation(id: string) {
  invitationSchoolId();
  const { data } = await apiClient.post(`${endpoint}/${encodeURIComponent(id)}/resend`, {});
  if (data.success !== true || data.data?.id !== id || data.data.status !== "pending_activation") throw new Error("Resend outcome unconfirmed. Refresh before retrying.");
}
