import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema } from "../../src/features/auth/schemas/login-schema.ts";
import { authLandingFor, safeInternalRedirect } from "../../src/services/auth/auth-routing.ts";
import { authenticatedSnapshot, canAuthorize, clearedSnapshot } from "../../src/services/auth/auth-state.ts";
import { createSingleFlight } from "../../src/services/auth/single-flight.ts";
import type { AuthUser } from "../../src/types/auth.ts";

function userWithRole(name?: string): AuthUser {
  return {
    id: "user-1", username: "operator", firstName: "Test", lastName: "Operator", displayName: "Test Operator",
    school: { id: "school-1", name: "Test School", status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: name ? [{ name }] : [], permissions: [], passwordResetRequired: false, status: "active",
    account: { active: true, locked: false, requiresPasswordReset: false },
  };
}

test("login schema matches backend username and password contract", () => {
  assert.equal(loginSchema.safeParse({ username: "teacher", password: "secret" }).success, true);
  assert.equal(loginSchema.safeParse({ username: "", password: "" }).success, false);
});

test("role routing is deterministic and fails closed without role names", () => {
  assert.equal(authLandingFor(userWithRole("Platform Owner")), "/workspace/admin/platform");
  assert.equal(authLandingFor(userWithRole("School Admin")), "/workspace/admin/school");
  assert.equal(authLandingFor(userWithRole("Teacher")), "/workspace/teacher");
  assert.equal(authLandingFor(userWithRole()), "/workspace");
});

test("safe redirects reject external, protocol-relative and login-loop destinations", () => {
  assert.equal(safeInternalRedirect("/workspace/teacher?tab=today", "/workspace"), "/workspace/teacher?tab=today");
  assert.equal(safeInternalRedirect("https://evil.example/steal", "/workspace"), "/workspace");
  assert.equal(safeInternalRedirect("//evil.example/steal", "/workspace"), "/workspace");
  assert.equal(safeInternalRedirect("/login", "/workspace"), "/workspace");
});

test("persisted identity cannot authorize without an authenticated memory token", () => {
  const user = userWithRole("Teacher");
  assert.equal(canAuthorize({ status: "guest", user, school: user.school, roles: user.roles, permissions: user.permissions, accessToken: null }), false);
  assert.equal(canAuthorize(authenticatedSnapshot(user, "memory-token")), true);
  assert.deepEqual(clearedSnapshot("expired"), {
    status: "expired", user: null, school: null, roles: [], permissions: [], accessToken: null,
  });
});

test("single-flight queues concurrent refresh callers and resets after completion", async () => {
  const flight = createSingleFlight<string>();
  let calls = 0;
  const task = async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 5)); return `token-${calls}`; };
  const [first, second] = await Promise.all([flight.run(task), flight.run(task)]);
  assert.equal(first, "token-1");
  assert.equal(second, "token-1");
  assert.equal(calls, 1);
  assert.equal(await flight.run(task), "token-2");
});
