import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AxiosError } from "axios";
import { apiClient, setApiAccessToken } from "../../src/services/api/api-client";
import { useAuthStore } from "../../src/store/auth-store";
import { authenticatedSnapshot } from "../../src/services/auth/auth-state";
import { normalizeAuthenticatedUser } from "../../src/services/auth/auth-normalizer";
import { invitationPermissions, canInviteSchoolUsers, inviteSchoolUser, resendSchoolInvitation, invitationOverview } from "../../src/features/administrator/services/school-user-invitation-service";
import { ActivationPasswordFields } from "../../src/features/auth/components/activation-password-fields";

function signIn(school: string | null = "alpha", permissions = invitationPermissions) {
  const user = normalizeAuthenticatedUser({ id: `admin-${school}`, name: "School admin", first_name: "School", last_name: "Admin", username: "admin@example.test", status: "active",
    scope: school ? "school" : "platform", school_id: school, school: school ? { id: school, name: school, status: "active", timezone: "Africa/Nairobi", locale: "en" } : null,
    roles: [school ? "School Admin" : "Platform Owner"], permissions, password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } });
  setApiAccessToken(`token-${school}`); useAuthStore.setState(authenticatedSnapshot(user, `token-${school}`));
}
const input = { email: "teacher@example.test", first_name: "Test", last_name: "Teacher", role_id: "teacher-role" };

test("invitation requests whitelist fields and never transmit tenant or credential overrides", async () => {
  const adapter = apiClient.defaults.adapter; signIn();
  try {
    apiClient.defaults.adapter = async config => {
      assert.deepEqual(JSON.parse(config.data), config.url!.endsWith("resend") ? {} : input);
      assert.equal(config.headers.get("X-School-Id"), undefined);
      return { config, status: 201, statusText: "Created", headers: {}, data: { success: true, data: { id: "invited-id", status: "pending_activation" } } };
    };
    await inviteSchoolUser({ ...input, school_id: "beta", password: "must-not-transmit" } as typeof input);
    await resendSchoolInvitation("invited-id");
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("platform users and administrators without each required permission cannot invite", async () => {
  const adapter = apiClient.defaults.adapter; let calls = 0;
  try {
    apiClient.defaults.adapter = async () => { calls++; throw new Error("Must not request"); };
    signIn(null); assert.equal(canInviteSchoolUsers(), false); await assert.rejects(inviteSchoolUser(input));
    for (const missing of invitationPermissions) { signIn("alpha", invitationPermissions.filter(value => value !== missing)); assert.equal(canInviteSchoolUsers(), false); await assert.rejects(inviteSchoolUser(input)); }
    assert.equal(calls, 0);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("pending invitation reads reject another school's response", async () => {
  const adapter = apiClient.defaults.adapter; signIn();
  try {
    apiClient.defaults.adapter = async config => ({ config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { school_id: "beta", school_code: "BETA", pending: [] } } });
    await assert.rejects(invitationOverview(), /Invalid school/);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("late invitation responses are rejected after switching school accounts", async () => {
  const adapter = apiClient.defaults.adapter; signIn();
  let release!: () => void; let started!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; }); const start = new Promise<void>(resolve => { started = resolve; });
  try {
    apiClient.defaults.adapter = async config => { started(); await wait; return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { school_id: "alpha", school_code: "ALPHA", pending: [] } } }; };
    const rejected = assert.rejects(invitationOverview()); await start; useAuthStore.getState().cancelChallenge(); signIn("beta"); release(); await rejected;
  } finally { release(); apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("denied invitations do not retry through any alternative endpoint", async () => {
  const adapter = apiClient.defaults.adapter; signIn(); let calls = 0;
  try {
    apiClient.defaults.adapter = async config => { calls++; throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: {}, data: { message: "Subscription unavailable" } }); };
    await assert.rejects(inviteSchoolUser(input)); assert.equal(calls, 1);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("activation indicators reflect the enforced 16-character complexity rule without revealing a strength claim", () => {
  const html = renderToStaticMarkup(createElement(ActivationPasswordFields, { password: "", confirmation: "", onPasswordChange() {}, onConfirmationChange() {} }));
  for (const label of ["Show password", "16–128 characters", "Uppercase letter", "Lowercase letter", "Number", "Symbol", "Passwords match", "Not met"]) assert.ok(html.includes(label));
  assert.ok(!html.includes("at least 12")); assert.ok(html.includes('type="password"'));
});
