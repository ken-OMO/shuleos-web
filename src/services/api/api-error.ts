import axios from "axios";
import type { ApiValidationErrors } from "./api-types";
import type { AuthErrorKind } from "@/types/auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly code: string | null = null,
    public readonly validationErrors: ApiValidationErrors = {},
    public readonly kind: AuthErrorKind = "unknown",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) return new ApiError("An unexpected error occurred. Please try again.");
  const payload = error.response?.data as { message?: string; code?: string; errors?: ApiValidationErrors } | undefined;
  const status = error.response?.status ?? null;
  const backendMessage = payload?.message?.toLowerCase() ?? "";
  const kind: AuthErrorKind = status === 422 ? "validation"
    : status === 401 ? "unauthenticated"
      : status === 403 && backendMessage.includes("school access") ? "account_unavailable"
        : status === 403 ? "forbidden"
          : !error.response ? "network"
            : status !== null && status >= 500 ? "server" : "unknown";
  const message = kind === "validation" ? "Please check the highlighted fields."
    : kind === "unauthenticated" ? "Your credentials or session could not be verified."
      : kind === "account_unavailable" ? "Your school account is currently unavailable. Contact an administrator."
        : kind === "forbidden" ? "You do not have access to this action."
          : kind === "network" ? "ShuleOS could not reach the server. Check your connection and try again."
            : kind === "server" ? "The server could not complete the request. Please try again later."
              : "The request could not be completed.";
  return new ApiError(
    error.code === "ECONNABORTED" ? "The request timed out." : message,
    status,
    payload?.code ?? error.code ?? null,
    payload?.errors ?? {},
    kind,
  );
}
