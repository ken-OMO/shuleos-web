import axios from "axios";
import type { ApiValidationErrors } from "./api-types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly code: string | null = null,
    public readonly validationErrors: ApiValidationErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) return new ApiError("An unexpected error occurred. Please try again.");
  const payload = error.response?.data as { message?: string; code?: string; errors?: ApiValidationErrors } | undefined;
  return new ApiError(
    payload?.message ?? (error.code === "ECONNABORTED" ? "The request timed out." : "The request could not be completed."),
    error.response?.status ?? null,
    payload?.code ?? error.code ?? null,
    payload?.errors ?? {},
  );
}
