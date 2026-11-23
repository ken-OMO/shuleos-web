import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { publicRegistrationClient, submitRegistration, registrationRequests, reviewRegistration, registrationPermissions, canReviewRegistrations } from "../../src/features/registration/registration-service";
import { PublicRegistrationForm } from "../../src/features/registration/public-registration-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient, setApiAccessToken } from "../../src/services/api/api-client";
import { useAuthStore } from "../../src/store/auth-store";
import { authenticatedSnapshot } from "../../src/services/auth/auth-state";
import { normalizeAuthenticatedUser } from "../../src/services/auth/auth-normalizer";

const input = { school_name: "Mansoor Academy", operating_mode: "day", admin: { first_name: "Amina", last_name: "Hassan", email: "amina@example.test" } };
function signIn(platform: boolean, permissions = registrationPermissions) {
  const user = normalizeAuthenticatedUser({ id: "registration-reviewer", name: "Reviewer", username: "reviewer", first_name: "Review", last_name: "Owner", status: "active",
    scope: platform ? "platform" : "school", school_id: platform ? null : "school-id", school: platform ? null : { id: "school-id", name: "School", status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: [platform ? "Platform Owner" : "School Admin"], permissions, password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } });
  setApiAccessToken("existing-owner-token"); useAuthStore.setState(authenticatedSnapshot(user, "existing-owner-token"));
}

test("public school request never sends a signed-in bearer token or authorizes the applicant", async () => {
  const adapter = publicRegistrationClient.defaults.adapter;
  signIn(true);
  const before = useAuthStore.getState().user;
  try {
    publicRegistrationClient.defaults.adapter = async config => {
      assert.equal(config.url, "/school-registration-requests");
      assert.equal(config.headers.get("Authorization"), undefined);
      assert.deepEqual(JSON.parse(config.data), input);
      return { config, status: 202, statusText: "Accepted", headers: {}, data: { success: true } };
    };
    await submitRegistration(input);
    assert.equal(useAuthStore.getState().user, before);
    assert.equal(useAuthStore.getState().accessToken, "existing-owner-token");
  } finally { publicRegistrationClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("public form asks for school and administrator details without collecting passwords or payment information", () => {
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(PublicRegistrationForm)));
  for (const name of ["school_name", "operating_mode", "admin.email", "admin.first_name", "admin.last_name"]) assert.ok(html.includes(`name="${name}"`));
  assert.ok(html.includes("platform-owner review"));
  assert.ok(!html.includes('type="password"'));
  assert.ok(!html.includes('name="role_id"'));
});

test("school identities and permissionless platform accounts cannot read or review applications", async () => {
  const adapter = apiClient.defaults.adapter;
  let calls = 0;
  try {
    apiClient.defaults.adapter = async () => { calls++; throw new Error("Must not request"); };
    for (const platform of [false, true]) {
      signIn(platform, platform ? [] : registrationPermissions);
      assert.equal(canReviewRegistrations(), false);
      await assert.rejects(registrationRequests(1, "pending"));
      await assert.rejects(reviewRegistration("request-id", "approve"));
    }
    assert.equal(calls, 0);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("authorized reviews use only dedicated endpoints and only send a rejection reason", async () => {
  const adapter = apiClient.defaults.adapter;
  signIn(true);
  try {
    apiClient.defaults.adapter = async config => {
      assert.ok(config.url!.startsWith("/admin/platform/school-registration-requests/"));
      const rejected = config.url!.endsWith("/reject");
      assert.deepEqual(JSON.parse(config.data), rejected ? { reason: "Verify authority" } : {});
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { id: "request-id", status: rejected ? "rejected" : "approved", school_id: rejected ? null : "school-id" } } };
    };
    await reviewRegistration("request-id", "approve");
    await reviewRegistration("request-id", "reject", "Verify authority");
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});
