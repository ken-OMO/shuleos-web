import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { QueryClient } from "@tanstack/react-query";
import { apiClient, getApiAccessToken } from "../../src/services/api/api-client";
import { useAuthStore } from "../../src/store/auth-store";
import { registerAuthQueryClient } from "../../src/services/auth/auth-cache";
import { normalizeAuthenticatedUser } from "../../src/services/auth/auth-normalizer";
import { authLandingFor } from "../../src/services/auth/auth-routing";
import { teacherDashboardService } from "../../src/features/teacher/services/teacher-dashboard-service";
import type { BackendAuthUser } from "../../src/types/auth";

function user(name: string, platform = false): BackendAuthUser {
  return { id: `user-${name}`, name, username: name, first_name: name, last_name: "Operator", status: "active",
    scope: platform ? "platform" : "school", school_id: platform ? null : `school-${name}`,
    school: platform ? null : { id: `school-${name}`, name: `${name} School`, status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: [platform ? "Platform Owner" : "Teacher"], permissions: [platform ? "view_platform_dashboard" : "access_teacher_portal"],
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
}
let calls: Array<{ url?: string; body: Record<string, string>; token: unknown }>;
let current = user("Alpha");
let queryClient: QueryClient;
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: "OK", headers: {} });
beforeEach(async () => {
  useAuthStore.getState().cancelChallenge(); calls = []; queryClient = new QueryClient(); registerAuthQueryClient(queryClient);
  apiClient.defaults.adapter = async config => {
    const body = config.data ? JSON.parse(config.data) : {};
    calls.push({ url: config.url, body, token: config.headers.get("Authorization") });
    if (config.url?.endsWith("/login")) {
      const name = body.username ?? body.identifier; current = user(name, config.url.startsWith("/platform"));
      if (name === "Activate" || current.scope === "platform") return response(config, { success: true, data: { authenticated: false, challenge_id: "challenge-1", challenge_token: "secret", expires_in: 600 } }, 202);
      return response(config, { success: true, token: `token-${name}` });
    }
    if (config.url?.endsWith("verify-otp")) {
      if (body.otp !== "123456") throw new AxiosError("Invalid code", "ERR_BAD_REQUEST", config, undefined, response(config, { message: "Verification failed." }, 401));
      if (current.username === "Activate") return response(config, { success: true, data: { authenticated: false, challenge_id: "challenge-1", activation_token: "activation-secret", expires_in: 600 } }, 202);
      return response(config, { success: true, token: "platform-token" });
    }
    if (config.url?.endsWith("/activate")) return response(config, { success: true, token: "activated-token" });
    if (config.url === "/auth/me") return response(config, { success: true, data: { user: current } });
    if (config.url === "/auth/logout") return response(config, { success: true });
    if (config.url === "/teacher/dashboard") return response(config, { success: true, data: { assignments: [{ name: `${current.username} private assignment` }] } });
    throw new Error(`Unexpected request ${config.url}`);
  };
});
const login = (name: string) => useAuthStore.getState().login({ username: name, password: "fixture-password" });

test("two schools use their own token and role dashboard; logout and direct switch clear cached data", async () => {
  await login("Alpha");
  assert.equal(authLandingFor(useAuthStore.getState().user!), "/workspace/teacher");
  assert.equal((await teacherDashboardService.dashboard()).assignments[0].name, "Alpha private assignment");
  queryClient.setQueryData(["Alpha-private"], { secret: "Alpha" });
  await useAuthStore.getState().logout();
  assert.equal(getApiAccessToken(), null); assert.equal(queryClient.getQueryCache().getAll().length, 0);
  assert.equal(useAuthStore.getState().hasRole("Teacher"), false);
  await login("Beta");
  assert.equal(useAuthStore.getState().school?.id, "school-Beta");
  assert.equal((await teacherDashboardService.dashboard()).assignments[0].name, "Beta private assignment");
  assert.deepEqual(calls.filter(c => c.url === "/teacher/dashboard").map(c => c.token), ["Bearer token-Alpha", "Bearer token-Beta"]);
  assert.equal(calls.find(c => c.url === "/auth/logout")?.token, "Bearer token-Alpha");
  queryClient.setQueryData(["Beta-private"], "Beta"); await login("Alpha");
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
});

test("platform sign-in uses identifier and OTP; null school reaches platform role landing", async () => {
  const result = await useAuthStore.getState().login({ username: "Owner", password: "fixture-password" }, "platform");
  assert.equal(result.kind, "challenge"); assert.equal(getApiAccessToken(), null);
  assert.equal(useAuthStore.getState().hasRole("Platform Owner"), false);
  assert.equal(calls.some(c => c.url === "/auth/me"), false);
  await useAuthStore.getState().continueChallenge({ otp: "123456" });
  assert.equal(useAuthStore.getState().user?.scope, "platform"); assert.equal(useAuthStore.getState().school, null);
  assert.equal(authLandingFor(useAuthStore.getState().user!), "/workspace/admin/platform");
  assert.equal(calls[0].body.identifier, "Owner");
});

test("202 activation never authorizes early; invalid OTP preserves challenge and valid activation authenticates", async () => {
  await login("Activate");
  await assert.rejects(useAuthStore.getState().continueChallenge({ otp: "000000" }));
  assert.equal(useAuthStore.getState().challenge?.kind, "otp");
  await useAuthStore.getState().continueChallenge({ otp: "123456" });
  assert.equal(useAuthStore.getState().challenge?.kind, "activation");
  assert.equal(calls.some(c => c.url === "/auth/me"), false);
  await useAuthStore.getState().continueChallenge({ password: "new-password-123", password_confirmation: "new-password-123" });
  assert.equal(useAuthStore.getState().status, "authenticated");
  assert.equal(useAuthStore.getState().challenge, null);
  assert.equal(calls.find(c => c.url === "/auth/first-login/activate")?.body.activation_token, "activation-secret");
});

test("expired and cancelled challenges cannot continue", async () => {
  await login("Activate"); useAuthStore.setState({ challenge: { ...useAuthStore.getState().challenge!, expiresAt: 0 } });
  await assert.rejects(useAuthStore.getState().continueChallenge({ otp: "123456" }), /expired/);
  useAuthStore.getState().cancelChallenge();
  await assert.rejects(useAuthStore.getState().continueChallenge({ otp: "123456" }), /sign in again/);
  assert.equal(getApiAccessToken(), null);
});

test("normalizer rejects tenant mismatch and supports platform school null", () => {
  assert.equal(normalizeAuthenticatedUser(user("Owner", true)).school, null);
  assert.throws(() => normalizeAuthenticatedUser({ ...user("Alpha"), school_id: "school-Beta" }), /scope/);
  assert.throws(() => normalizeAuthenticatedUser({ ...user("Owner", true), school_id: "school-Alpha" }), /scope/);
});

test("late previous-school dashboard responses are rejected after account switch", async () => {
  await login("Alpha");
  const original = apiClient.defaults.adapter as (config: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>;
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  apiClient.defaults.adapter = async config => {
    if (config.url === "/teacher/dashboard") { started(); await new Promise<void>(resolve => { release = resolve; }); return response(config, { data: { assignments: [{ name: "Alpha secret" }] } }); }
    return original(config);
  };
  const pending = teacherDashboardService.dashboard();
  const rejected = assert.rejects(pending, /Session changed/);
  await ready; await login("Beta"); release(); await rejected;
  assert.equal(useAuthStore.getState().school?.id, "school-Beta"); assert.equal(getApiAccessToken(), "token-Beta");
});

test("late login /me cannot restore or clear authorization after a newer school login", async () => {
  const original = apiClient.defaults.adapter as (config: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>;
  let release!: () => void; let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  apiClient.defaults.adapter = async config => {
    if (config.url === "/auth/me" && config.headers.get("Authorization") === "Bearer token-Alpha") {
      started(); await new Promise<void>(resolve => { release = resolve; });
      return response(config, { success: true, data: { user: user("Alpha") } });
    }
    return original(config);
  };
  const old = login("Alpha"); const rejected = assert.rejects(old, /Session changed/);
  await ready; await login("Beta"); release(); await rejected;
  assert.equal(useAuthStore.getState().school?.id, "school-Beta"); assert.equal(getApiAccessToken(), "token-Beta");
});

test("platform first-login activation uses platform endpoints and remains schoolless", async () => {
  await useAuthStore.getState().login({ username: "Activate", password: "fixture-password" }, "platform");
  await useAuthStore.getState().continueChallenge({ otp: "123456" });
  await useAuthStore.getState().continueChallenge({ password: "new-password-123", password_confirmation: "new-password-123" });
  assert.equal(calls.some(c => c.url === "/platform/auth/activate"), true);
  assert.equal(useAuthStore.getState().user?.scope, "platform"); assert.equal(useAuthStore.getState().school, null);
});

test("malformed 202 cannot become an authenticated session", async () => {
  apiClient.defaults.adapter = async config => response(config, { success: true, data: { authenticated: false } }, 202);
  await assert.rejects(login("Alpha"), /Invalid authentication challenge/);
  assert.equal(getApiAccessToken(), null); assert.equal(useAuthStore.getState().status, "guest");
  assert.equal(useAuthStore.getState().challenge, null);
});

test("network logout failure still removes identity, token and cached school records", async () => {
  await login("Alpha"); queryClient.setQueryData(["private"], "Alpha");
  apiClient.defaults.adapter = async () => { throw new Error("offline"); };
  await useAuthStore.getState().logout();
  assert.equal(getApiAccessToken(), null); assert.equal(useAuthStore.getState().user, null);
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
});
