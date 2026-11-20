import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dashboardRetry, nullableNumber } from "../../src/features/dashboard/dashboard-contract.ts";
import { navigationItemVisible, visibleActionKeys, workspacePathForRoles } from "../../src/features/dashboard/dashboard-policy.ts";
import { normalizeTeacherDashboard } from "../../src/features/teacher/services/teacher-dashboard-normalizer.ts";

test("role landing separates platform and school administration", () => {
  assert.equal(workspacePathForRoles(["Platform Owner"]), "/workspace/admin/platform");
  assert.equal(workspacePathForRoles(["School Admin"]), "/workspace/admin/school");
  assert.equal(workspacePathForRoles(["Deputy Headteacher"]), "/workspace/leadership");
  assert.equal(workspacePathForRoles([]), "/workspace");
});

test("dashboard values preserve real zero and represent missing values as unavailable", () => {
  assert.equal(nullableNumber(0), 0);
  assert.equal(nullableNumber(undefined), null);
  assert.equal(nullableNumber(Number.NaN), null);
});

test("navigation filters by authoritative roles and permissions", () => {
  assert.equal(navigationItemVisible({ roles: ["Teacher"] }, ["Teacher"], []), true);
  assert.equal(navigationItemVisible({ roles: ["Teacher"] }, ["Parent"], []), false);
  assert.equal(navigationItemVisible({ permissions: ["view_finance_oversight"] }, ["HOD"], []), false);
});

test("teacher dashboard response normalization uses confirmed snake-case fields and bounded lists", () => {
  const normalized = normalizeTeacherDashboard({ todays_timetable: [{ id: "lesson-1" }], assignments: [{ id: "assignment-1" }], analytics: { coverage: 0 }, last_refreshed_at: "2026-07-19T08:00:00Z" });
  assert.deepEqual(normalized.todaysTimetable, [{ id: "lesson-1" }]);
  assert.deepEqual(normalized.assignments, [{ id: "assignment-1" }]);
  assert.equal(normalized.analytics.coverage, 0);
  assert.equal(normalized.lastRefreshedAt, "2026-07-19T08:00:00Z");
});

test("quick actions require permissions and HOD finance stays excluded", () => {
  const actions = [
    { key: "actions", permission: "view_leadership_action_queue" },
    { key: "finance", permission: "view_finance_oversight", excludedRoles: ["HOD"] },
  ];
  assert.deepEqual(visibleActionKeys(actions, ["HOD"], ["view_leadership_action_queue", "view_finance_oversight"]), ["actions"]);
  assert.deepEqual(visibleActionKeys(actions, ["Principal"], ["view_leadership_action_queue", "view_finance_oversight"]), ["actions", "finance"]);
});

test("dashboard retries transient failures but fails closed on authentication and authorization", () => {
  assert.equal(dashboardRetry(0, { status: 503 }), true);
  assert.equal(dashboardRetry(2, { status: 503 }), false);
  assert.equal(dashboardRetry(0, { status: 401 }), false);
  assert.equal(dashboardRetry(0, { status: 403 }), false);
});

test("dashboard services do not contain fabricated fallback records", async () => {
  const files = [
    "src/features/administrator/services/administrator-dashboard-service.ts",
    "src/features/leadership/services/leadership-dashboard-service.ts",
    "src/features/teacher/services/teacher-dashboard-service.ts",
    "src/features/parent/services/parent-dashboard-service.ts",
    "src/features/learner/services/learner-dashboard-service.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /mock|fixture|fake|sampleData|fallbackData/i, file);
  }
});
