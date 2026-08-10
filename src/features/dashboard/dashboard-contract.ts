export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors: unknown;
  meta?: { timestamp?: string; request_id?: string | null; api_version?: string };
}

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

export function asRecords(value: unknown, limit = 20): UnknownRecord[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null).slice(0, limit) as UnknownRecord[] : [];
}

export function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function dashboardRetry(failureCount: number, error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: unknown }).status : null;
  return status !== 401 && status !== 403 && failureCount < 2;
}

export function hasRole(roles: string[], expected: string[]): boolean {
  const names = new Set(roles.map((role) => role.toLowerCase()));
  return expected.some((role) => names.has(role.toLowerCase()));
}

export function hasPermission(permissions: string[], expected: string): boolean {
  return permissions.includes(expected);
}
