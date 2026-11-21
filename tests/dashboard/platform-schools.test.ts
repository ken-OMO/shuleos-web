import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AxiosError } from "axios";
import { QueryClient } from "@tanstack/react-query";
import { apiClient, setApiAccessToken } from "../../src/services/api/api-client";
import { useAuthStore } from "../../src/store/auth-store";
import { authenticatedSnapshot } from "../../src/services/auth/auth-state";
import { normalizeAuthenticatedUser } from "../../src/services/auth/auth-normalizer";
import { dashboardRetry } from "../../src/features/dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../src/features/dashboard/dashboard-query-keys";
import { canReadPlatformSchools, fetchPlatformSchools, normalizePlatformSchools, platformSchoolsPermissions } from "../../src/features/administrator/services/platform-schools-service";
import { PlatformSchoolsTable } from "../../src/features/administrator/components/platform-schools-directory";
import { navigationForUser } from "../../src/config/navigation";

function signIn(platform = true, permissions = platformSchoolsPermissions) {
  const user = normalizeAuthenticatedUser({ id: platform ? "owner" : "school-admin", name: "Directory Admin", username: "directory-admin", first_name: "Directory", last_name: "Admin", status: "active",
    scope: platform ? "platform" : "school", school_id: platform ? null : "school-id",
    school: platform ? null : { id: "school-id", name: "School", status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: [platform ? "Platform Owner" : "School Admin"], permissions,
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false },
  });
  setApiAccessToken("directory-token");
  useAuthStore.setState(authenticatedSnapshot(user, "directory-token"));
  return user;
}
function payload() {
  return { current_page: 1, last_page: 2, total: 26, data: [
    { id: "school-a", school_name: "Mathari Primary", school_code: "MATH", lifecycle_state: "active", active: true, created_at: "2026-11-20T08:00:00Z", last_login: "not-an-authoritative-usage-field" },
    { id: "school-b", school_name: "Beta School", school_code: "BETA", lifecycle_state: "onboarding", active: true, created_at: null },
  ] };
}

test("directory normalizes the Laravel paginator without inferring usage from active flags or metadata", () => {
  const directory = normalizePlatformSchools(payload());
  assert.equal(directory.total, 26);
  assert.equal(directory.lastPage, 2);
  assert.deepEqual(directory.schools[0], { id: "school-a", name: "Mathari Primary", code: "MATH", lifecycle: "active", registeredAt: "2026-11-20T08:00:00Z" });
  assert.deepEqual(normalizePlatformSchools({ current_page: 1, last_page: 1, total: 0, data: [] }), { page: 1, lastPage: 1, total: 0, schools: [] });
  for (const value of [null, [], { ...payload(), data: null }, { ...payload(), total: -1 }, { ...payload(), current_page: "1" }, { ...payload(), data: [{}] }]) assert.throws(() => normalizePlatformSchools(value));
  assert.notDeepEqual(dashboardQueryKeys.administrator.schools(1, ""), dashboardQueryKeys.administrator.schools(2, ""));
  assert.notDeepEqual(dashboardQueryKeys.administrator.schools(1, ""), dashboardQueryKeys.administrator.schools(1, "onboarding"));
});

test("directory renders school names and lifecycle status without usage claims or business controls", () => {
  const html = renderToStaticMarkup(createElement(PlatformSchoolsTable, { directory: normalizePlatformSchools(payload()), filtered: false }));
  for (const label of ["Mathari Primary", "Beta School", "Active", "Onboarding", "Lifecycle status", "Registered", "Unavailable"]) assert.ok(html.includes(label), label);
  for (const absent of ["last_login", "not-an-authoritative", "Actively using", "Activate school", "Suspend", "Delete"]) assert.ok(!html.includes(absent), absent);
  const empty = normalizePlatformSchools({ current_page: 1, last_page: 1, total: 0, data: [] });
  assert.ok(renderToStaticMarkup(createElement(PlatformSchoolsTable, { directory: empty, filtered: true })).includes("No schools match"));
  assert.ok(renderToStaticMarkup(createElement(PlatformSchoolsTable, { directory: empty, filtered: false })).includes("No registered schools"));
});

test("school directory requests only the platform read endpoint and validates pagination", async () => {
  const adapter = apiClient.defaults.adapter;
  const signal = new AbortController().signal;
  let calls = 0;
  signIn();
  try {
    apiClient.defaults.adapter = async config => {
      calls++;
      assert.equal(config.method, "get");
      assert.equal(config.url, "/admin/platform/schools");
      assert.deepEqual(config.params, { page: 1, per_page: 25, state: "onboarding" });
      assert.equal(config.signal, signal);
      assert.equal(config.headers.get("X-School-Id"), undefined);
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: payload() } };
    };
    assert.equal((await fetchPlatformSchools(1, "onboarding", signal)).schools.length, 2);
    await assert.rejects(fetchPlatformSchools(0, ""));
    assert.equal(calls, 1);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("school accounts and platform identities without each required permission cannot request the directory", async () => {
  const adapter = apiClient.defaults.adapter;
  let calls = 0;
  try {
    apiClient.defaults.adapter = async () => { calls++; throw new Error("Must not request"); };
    for (const permission of platformSchoolsPermissions) {
      const user = signIn(true, platformSchoolsPermissions.filter(value => value !== permission));
      assert.equal(canReadPlatformSchools(), false);
      assert.ok(!navigationForUser(user)[0].items.some(item => item.title === "Schools"));
      await assert.rejects(fetchPlatformSchools(1, ""));
    }
    const school = signIn(false);
    assert.equal(canReadPlatformSchools(), false);
    assert.ok(!navigationForUser(school)[0].items.some(item => item.title === "Schools"));
    await assert.rejects(fetchPlatformSchools(1, ""));
    const owner = signIn();
    assert.ok(navigationForUser(owner)[0].items.some(item => item.href === "/workspace/admin/platform/schools"));
    assert.equal(calls, 0);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("denied directory reads never fall back to a school endpoint or retry a 403", async () => {
  const adapter = apiClient.defaults.adapter;
  const client = new QueryClient();
  const calls: string[] = [];
  signIn();
  try {
    apiClient.defaults.adapter = async config => {
      calls.push(config.url!);
      throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: {}, data: {} });
    };
    await assert.rejects(client.fetchQuery({ queryKey: ["directory"], queryFn: () => fetchPlatformSchools(1, ""), retry: dashboardRetry, retryDelay: 0 }));
    assert.deepEqual(calls, ["/admin/platform/schools"]);
  } finally { client.clear(); apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("directory rejects a late response after the platform owner signs out", async () => {
  const adapter = apiClient.defaults.adapter;
  let release!: () => void;
  let started!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  signIn();
  try {
    apiClient.defaults.adapter = async config => {
      started(); await wait;
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: payload() } };
    };
    const rejected = assert.rejects(fetchPlatformSchools(1, ""));
    await requestStarted;
    useAuthStore.getState().cancelChallenge();
    release();
    await rejected;
  } finally { release(); apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});
