import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { environment } from "@/config/environment";
import { normalizeApiError } from "./api-error";

type RefreshHandler = () => Promise<string | null>;

let accessToken: string | null = null;
let refreshHandler: RefreshHandler | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

interface RetriableRequest extends InternalAxiosRequestConfig { _refreshAttempted?: boolean }

export const apiClient = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

export function setApiAccessToken(token: string | null) { accessToken = token; }
export function configureTokenRefresh(handler: RefreshHandler | null) { refreshHandler = handler; }
export function configureUnauthorizedHandler(handler: (() => void) | null) { unauthorizedHandler = handler; }

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined;
    if (error.response?.status === 401 && request && !request._refreshAttempted && refreshHandler) {
      request._refreshAttempted = true;
      refreshPromise ??= refreshHandler().finally(() => { refreshPromise = null; });
      const token = await refreshPromise;
      if (token) {
        setApiAccessToken(token);
        return apiClient(request);
      }
    }
    if (error.response?.status === 401) unauthorizedHandler?.();
    return Promise.reject(normalizeApiError(error));
  },
);

export function multipartHeaders() { return { "Content-Type": "multipart/form-data" } as const; }
