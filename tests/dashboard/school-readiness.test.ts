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
import { canReadSchoolReadiness, fetchSchoolReadiness, normalizeSchoolReadiness } from "../../src/features/administrator/services/school-readiness-service";
import { SchoolReadinessResults } from "../../src/features/administrator/components/school-readiness-summary";
import { dashboardRetry } from "../../src/features/dashboard/dashboard-contract";
import { navigationForUser } from "../../src/config/navigation";

function signIn(name: string, platform = false, permission = true) {
  const user = normalizeAuthenticatedUser({
    id: `user-${name}`, name, username: name, first_name: name, last_name: "Admin", status: "active",
    scope: platform ? "platform" : "school", school_id: platform ? null : `school-${name}`,
    school: platform ? null : { id: `school-${name}`, name, status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: [platform ? "Platform Owner" : "School Admin"], permissions: permission ? ["view_academic_setup_status"] : [],
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false },
  });
  setApiAccessToken(`token-${name}`);
  useAuthStore.setState(authenticatedSnapshot(user, `token-${name}`));
  return user;
}
const ready = { complete: true, missing: [] };
function payload(schoolId = "school-Alpha") {
  return { school_id: schoolId, initial_setup: ready, academic_configuration: ready,
    teaching_coverage: { complete: false, missing: [{ code: "unassigned_learning_areas", count: 0, items: [] }, { code: "streams_without_class_teachers", count: 2, items: [{ stream_name: "North" }] }] } };
}

test("readiness preserves independent results, zero counts and malformed group unavailability", () => {
  const result = normalizeSchoolReadiness(payload(), "school-Alpha");
  assert.equal(result.initial_setup.complete, true);
  assert.equal(result.teaching_coverage.complete, false);
  assert.equal(result.teaching_coverage.missing[0].count, 0);
  assert.deepEqual(result.teaching_coverage.missing[1].names, ["North"]);
  for (const group of [undefined, { complete: "true", missing: [] }, { complete: true }, { complete: true, missing: [{ code: "active_teachers" }] }, { complete: false, missing: [null] }]) {
    const data = normalizeSchoolReadiness({ ...payload(), academic_configuration: group }, "school-Alpha");
    assert.equal(data.academic_configuration.complete, null);
    assert.equal(data.initial_setup.complete, true);
  }
  assert.throws(() => normalizeSchoolReadiness(payload("school-Beta"), "school-Alpha"), /does not match/);
  assert.throws(() => normalizeSchoolReadiness(null, "school-Alpha"), /does not match/);
});

test("readiness UI renders all three states and useful prerequisites without implying admission needs teachers", () => {
  const html = renderToStaticMarkup(createElement(SchoolReadinessResults, {
    data: normalizeSchoolReadiness({ ...payload(), academic_configuration: null }, "school-Alpha"),
    loading: false, failed: false, refreshing: false, onRefresh() {},
  }));
  for (const label of ["Initial setup", "Academic configuration", "Teaching coverage", "Complete", "Unavailable", "Needs attention", "Streams need class teachers", "North", "(0)", "separate from the initial setup required for admission"]) assert.ok(html.includes(label), label);
  assert.ok(!html.includes("school-Alpha"));
});

test("loading and failure do not render cached complete badges; retry remains available", () => {
  for (const failed of [false, true]) {
    const html = renderToStaticMarkup(createElement(SchoolReadinessResults, {
      data: normalizeSchoolReadiness(payload(), "school-Alpha"), loading: !failed, failed, refreshing: !failed, onRefresh() {},
    }));
    assert.ok(html.includes(failed ? "role=\"alert\"" : "role=\"status\""));
    assert.ok(html.includes(failed ? "Try again" : "Loading school readiness"));
    assert.ok(!html.includes(">Complete<"));
  }
});

test("school request preserves cancellation, rejects platform/permissionless access and never sends tenant overrides", async () => {
  const adapter = apiClient.defaults.adapter;
  let calls = 0;
  const signal = new AbortController().signal;
  try {
    apiClient.defaults.adapter = async config => {
      calls++;
      assert.equal(config.url, "/admin/school/readiness");
      assert.equal(config.signal, signal);
      assert.equal(config.params?.school_id, undefined);
      assert.equal(config.headers.get("X-School-Id"), undefined);
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: payload() } };
    };
    const school = signIn("Alpha");
    await fetchSchoolReadiness(school.school!.id, signal);
    assert.ok(navigationForUser(school)[0].items.some(item => item.title === "School readiness"));
    for (const user of [signIn("Owner", true), signIn("Alpha", false, false)]) {
      assert.equal(canReadSchoolReadiness(), false);
      assert.ok(!navigationForUser(user)[0].items.some(item => item.title === "School readiness"));
      await assert.rejects(fetchSchoolReadiness("school-Alpha", signal));
    }
    assert.equal(calls, 1);
  } finally {
    apiClient.defaults.adapter = adapter;
    useAuthStore.getState().cancelChallenge();
  }
});

test("denied readiness has no endpoint fallback; query retry can recover a transient failure", async () => {
  const adapter = apiClient.defaults.adapter;
  const calls: string[] = [];
  const client = new QueryClient();
  signIn("Alpha");
  try {
    apiClient.defaults.adapter = async config => {
      calls.push(config.url!);
      throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: {}, data: {} });
    };
    await assert.rejects(client.fetchQuery({ queryKey: ["denied"], queryFn: () => fetchSchoolReadiness("school-Alpha"), retry: dashboardRetry, retryDelay: 0 }));
    assert.deepEqual(calls, ["/admin/school/readiness"]);
    let attempts = 0;
    apiClient.defaults.adapter = async config => {
      if (++attempts === 1) throw new AxiosError("Unavailable", "ERR_BAD_RESPONSE", config, undefined, { config, status: 503, statusText: "Unavailable", headers: {}, data: {} });
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: payload() } };
    };
    const result = await client.fetchQuery({ queryKey: ["recovered"], queryFn: () => fetchSchoolReadiness("school-Alpha"), retry: dashboardRetry, retryDelay: 0 });
    assert.equal(result.initial_setup.complete, true);
    assert.equal(attempts, 2);
  } finally {
    client.clear();
    apiClient.defaults.adapter = adapter;
    useAuthStore.getState().cancelChallenge();
  }
});

test("late readiness responses after account switch are rejected", async () => {
  const adapter = apiClient.defaults.adapter;
  let release!: () => void;
  let started!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  signIn("Alpha");
  try {
    apiClient.defaults.adapter = async config => {
      started(); await pending;
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: payload() } };
    };
    const request = fetchSchoolReadiness("school-Alpha");
    const rejected = assert.rejects(request);
    await requestStarted;
    useAuthStore.getState().cancelChallenge();
    signIn("Beta");
    release();
    await rejected;
  } finally {
    release();
    apiClient.defaults.adapter = adapter;
    useAuthStore.getState().cancelChallenge();
  }
});
