import assert from "node:assert/strict";
import test from "node:test";
import { workspaceOptions } from "../../src/features/dashboard/workspace-options.ts";
import { workspacePathForRoles } from "../../src/features/dashboard/dashboard-policy.ts";
import { authLandingFor } from "../../src/services/auth/auth-routing.ts";
import { normalizeAuthenticatedUser } from "../../src/services/auth/auth-normalizer.ts";
import { authenticatedSnapshot } from "../../src/services/auth/auth-state.ts";
import { useAuthStore } from "../../src/store/auth-store.ts";
import { apiClient, setApiAccessToken } from "../../src/services/api/api-client.ts";
import { canManageStaff, changeStaffRole, staffAccess, officeSummary, staffPermissions } from "../../src/features/administrator/services/school-staff-access-service.ts";

function user(roles: string[], permissions: string[], school: string | null = "alpha") {
  return normalizeAuthenticatedUser({ id: "staff-user", username: "staff", first_name: "Test", last_name: "Staff", name: "Test Staff", status: "active", scope: school ? "school" : "platform", school_id: school, school: school ? { id: school, name: school, status: "active", timezone: "Africa/Nairobi", locale: "en" } : null, roles, permissions, password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } });
}
function signIn(roles = ["School Admin"], permissions = staffPermissions, school: string | null = "alpha") {
  const value = user(roles, permissions, school); setApiAccessToken(null); setApiAccessToken("synthetic"); useAuthStore.setState(authenticatedSnapshot(value, "synthetic")); return value;
}

test("director, headteacher and secretary route to their own workspace; dual responsibilities expose both", () => {
  const admin = ["access_administrator_portal", "view_admin_dashboard"], leadership = ["access_leadership_portal_phase_two"], office = ["access_school_office", "view_school_office_summary"];
  for (const [roles, permissions, paths] of [
    [["Director"], admin, ["/workspace/admin/school"]],
    [["Headteacher"], leadership, ["/workspace/leadership"]],
    [["School Secretary"], office, ["/workspace/office"]],
    [["School Admin", "Headteacher"], [...admin, ...leadership], ["/workspace/admin/school", "/workspace/leadership"]],
  ] as Array<[string[], string[], string[]]>) {
    const value = user(roles, permissions);
    assert.deepEqual(workspaceOptions(value).map(option => option.href), paths);
    assert.equal(workspacePathForRoles(roles), paths[0]); assert.equal(authLandingFor(value), paths[0]);
  }
  assert.deepEqual(workspaceOptions(user(["Headteacher"], admin)), []);
  assert.deepEqual(workspaceOptions(user(["School Admin"], admin, null)), []);
});

test("staff changes whitelist role and assignment, with no school or permission override", async () => {
  const adapter = apiClient.defaults.adapter; signIn();
  try {
    apiClient.defaults.adapter = async config => {
      assert.deepEqual(JSON.parse(config.data), { role: "Headteacher", assigned: true });
      assert.equal(config.headers.get("X-School-Id"), undefined);
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { school_id: "alpha", user_id: "target", role: "Headteacher", assigned: true } } };
    };
    await changeStaffRole("target", "Headteacher", true);
    await assert.rejects(changeStaffRole("target", "Platform Owner" as "Headteacher", true));
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("headteacher, secretary, platform and missing-permission identities cannot manage staff", async () => {
  const adapter = apiClient.defaults.adapter; let calls = 0;
  try {
    apiClient.defaults.adapter = async () => { calls++; throw new Error("Unexpected request"); };
    for (const role of ["Headteacher", "School Secretary", "Platform Owner"]) { signIn([role]); assert.equal(canManageStaff(), false); await assert.rejects(staffAccess(1)); }
    signIn(["School Admin"], staffPermissions, null); assert.equal(canManageStaff(), false);
    for (const permission of staffPermissions) { signIn(["School Admin"], staffPermissions.filter(value => value !== permission)); await assert.rejects(changeStaffRole("target", "Headteacher", true)); }
    assert.equal(calls, 0);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("staff and office reads reject another school's response and malformed pagination", async () => {
  const adapter = apiClient.defaults.adapter; signIn();
  try {
    apiClient.defaults.adapter = async config => ({ config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { school_id: "beta", page: 1, last_page: 1, users: [] } } });
    await assert.rejects(staffAccess(1), /Invalid staff/); await assert.rejects(staffAccess(0));
    signIn(["School Secretary"], ["access_school_office", "view_school_office_summary"]);
    await assert.rejects(officeSummary(), /Invalid school office/);
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("late role updates cannot confirm after switching school identities", async () => {
  const adapter = apiClient.defaults.adapter; signIn(); let release!: () => void, started!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; }), start = new Promise<void>(resolve => { started = resolve; });
  try {
    apiClient.defaults.adapter = async config => { started(); await pending; return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { school_id: "alpha", user_id: "target", role: "Headteacher", assigned: true } } }; };
    const rejected = assert.rejects(changeStaffRole("target", "Headteacher", true)); await start; signIn(["School Admin"], staffPermissions, "beta"); release(); await rejected;
  } finally { release(); apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});
