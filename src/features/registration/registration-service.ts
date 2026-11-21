import axios from "axios";
import { environment } from "@/config/environment";
import { apiClient } from "@/services/api/api-client";
import { normalizeApiError } from "@/services/api/api-error";
import { useAuthStore } from "@/store/auth-store";
import { asRecord } from "@/features/dashboard/dashboard-contract";

export interface RegistrationInput {
  school_name: string; operating_mode: string;
  admin: { first_name: string; last_name: string; email: string };
  email?: string; phone?: string; physical_address?: string; postal_address?: string;
}
export interface Registration extends Omit<RegistrationInput, "admin" | "email" | "phone" | "physical_address" | "postal_address"> {
  email?: string | null; phone?: string | null; physical_address?: string | null; postal_address?: string | null;
  id: string; status: "pending" | "approved" | "rejected"; school_id: string | null;
  admin_first_name: string; admin_last_name: string; admin_email: string; created_at: string;
  review_reason: string | null;
}
export interface RegistrationPage { data: Registration[]; current_page: number; last_page: number; total: number }
// Public submissions never carry the currently signed-in user's bearer token.
export const publicRegistrationClient = axios.create({ baseURL: environment.apiBaseUrl, timeout: 15_000, headers: { Accept: "application/json" } });
export async function submitRegistration(input: RegistrationInput) {
  try {
    const response = await publicRegistrationClient.post("/school-registration-requests", input);
    if (response.status !== 202 || response.data?.success !== true) throw new Error("Registration could not be confirmed.");
  } catch (error) { throw normalizeApiError(error); }
}
export const registrationPermissions = ["access_administrator_portal", "access_platform_administration", "onboard_schools"];
export function canReviewRegistrations(state = useAuthStore.getState()) {
  return state.status === "authenticated" && state.user?.scope === "platform" && state.user.school === null &&
    state.hasAnyRole(["Platform Owner", "Platform Super Administrator"]) && registrationPermissions.every(state.hasPermission);
}
function requireReviewer() {
  if (!canReviewRegistrations()) throw Object.assign(new Error("Platform review access is unavailable."), { status: 403 });
}
export async function registrationRequests(page: number, status: Registration["status"], signal?: AbortSignal): Promise<RegistrationPage> {
  requireReviewer();
  const { data } = await apiClient.get("/admin/platform/school-registration-requests", { params: { page, status }, signal });
  const raw = asRecord(data.data);
  if (data.success !== true || !Array.isArray(raw.data) || raw.data.length > 25 || raw.current_page !== page ||
    !Number.isSafeInteger(raw.last_page) || Number(raw.last_page) < page || !Number.isSafeInteger(raw.total) || Number(raw.total) < raw.data.length) throw new Error("Invalid registration list response.");
  for (const row of raw.data) {
    if (!row || typeof row.id !== "string" || typeof row.school_name !== "string" || typeof row.admin_email !== "string" || typeof row.admin_first_name !== "string" || typeof row.admin_last_name !== "string" ||
      !["day", "boarding", "day_and_boarding"].includes(row.operating_mode) || row.status !== status ||
      [row.email, row.phone, row.physical_address, row.postal_address, row.review_reason].some(value => value != null && typeof value !== "string")) throw new Error("Invalid registration record.");
  }
  return raw as unknown as RegistrationPage;
}
export async function reviewRegistration(id: string, action: "approve" | "reject", reason?: string) {
  requireReviewer();
  const { data } = await apiClient.post(`/admin/platform/school-registration-requests/${encodeURIComponent(id)}/${action}`, action === "reject" ? { reason } : {});
  const result = asRecord(data.data);
  if (data.success !== true || result.id !== id || result.status !== (action === "approve" ? "approved" : "rejected") || (action === "approve" && (typeof result.school_id !== "string" || !result.school_id))) throw new Error("Review outcome could not be confirmed. Refresh the requests.");
}
