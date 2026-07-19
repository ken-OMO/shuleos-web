import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { environment } from "@/config/environment";
import { normalizeApiError } from "./api-error";
import { createSingleFlight } from "@/services/auth/single-flight";

type RefreshHandler = () => Promise<string | null>;

let accessToken: string | null = null;
let refreshHandler: RefreshHandler | null = null;
let unauthorizedHandler: (() => void) | null = null;
const refreshFlight = createSingleFlight<string | null>();

interface RetriableRequest extends InternalAxiosRequestConfig { _refreshAttempted?: boolean; skipAuthRefresh?: boolean }

declare module "axios" {
  export interface AxiosRequestConfig { skipAuthRefresh?: boolean }
}

const authLifecyclePaths = ["/auth/login", "/auth/logout", "/auth/refresh"];

export const apiClient = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

export function setApiAccessToken(token: string | null) { accessToken = token; }
export function getApiAccessToken() { return accessToken; }
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
    const path = request?.url ? new URL(request.url, environment.apiBaseUrl).pathname : "";
    const lifecycleEndpoint = authLifecyclePaths.find((endpoint) => path.endsWith(endpoint));
    const refreshAllowed = request && !request.skipAuthRefresh && !request._refreshAttempted && !lifecycleEndpoint;
    if (error.response?.status === 401 && accessToken && refreshAllowed && refreshHandler) {
      request._refreshAttempted = true;
      try {
        const token = await refreshFlight.run(refreshHandler);
        if (token) {
          setApiAccessToken(token);
          return apiClient(request);
        }
      } catch {
        setApiAccessToken(null);
      }
    }
    if (error.response?.status === 401 && lifecycleEndpoint !== "/auth/login" && lifecycleEndpoint !== "/auth/logout") unauthorizedHandler?.();
    return Promise.reject(normalizeApiError(error));
  },
);

export function multipartHeaders() { return { "Content-Type": "multipart/form-data" } as const; }
