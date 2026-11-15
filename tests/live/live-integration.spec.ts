import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

interface School {
  id: string; name: string; users: Record<string, { id: string; username: string }>;
  learnerId: string; unlinkedLearnerId: string; assignmentId: string;
}
interface Fixtures { password: string; schools: Record<"Alpha" | "Beta", School> }
const fixtures = JSON.parse(readFileSync("tests/live/fixtures.json", "utf8")) as Fixtures;
const api = "http://127.0.0.1:8000/api";
test.beforeEach(() => {
  // Test-only CLI; guarded by APP_ENV, DB name/host, mail/cache settings and no config cache.
  execFileSync("php", ["tests/live/seed.php", "reset-cache"], { stdio: "pipe" });
});
async function signIn(request: APIRequestContext, school: School, role: string) {
  const response = await request.post(`${api}/auth/login`, { data: { username: school.users[role].username, password: fixtures.password } });
  expect(response.status(), `Real login for ${role}`).toBe(200);
  const body = await response.json();
  expect(body.data.user.school.id).toBe(school.id);
  expect(body.data.user.scope).toBe("school");
  expect(typeof body.token).toBe("string");
  return body.token as string;
}
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  const response = page.waitForResponse(r => r.url() === `${api}/auth/logout`);
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/login/);
}
const roleCases = [
  { role: "teacher", path: "/workspace/teacher", endpoint: "/teacher/dashboard", title: "Teaching workspace" },
  { role: "admin", path: "/workspace/admin/school", endpoint: "/admin/dashboard/school", title: "School administration" },
  { role: "leadership", path: "/workspace/leadership", endpoint: "/leadership/dashboard/principal", title: "Principal dashboard" },
  { role: "parent", path: "/workspace/parent", endpoint: "/parent/dashboard", title: "Family workspace" },
  { role: "learner", path: "/workspace/learner", endpoint: "/learner/dashboard", title: "Learning workspace" },
];
for (const { role, path, endpoint, title } of roleCases) {
  test(`real ${role}: Alpha login → dashboard → logout → Beta switch`, async ({ page, request }) => {
    let previousToken: string | undefined;
    for (const name of ["Alpha", "Beta"] as const) {
      const school = fixtures.schools[name];
      await page.goto("/login");
      await page.getByLabel("Username", { exact: true }).fill(school.users[role].username);
      await page.getByLabel("Password", { exact: true }).fill(fixtures.password);
      const login = page.waitForResponse(r => r.url() === `${api}/auth/login`);
      const dashboard = page.waitForResponse(r => r.url().split("?")[0] === `${api}${endpoint}`);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const loggedIn = await login; expect(loggedIn.status()).toBe(200);
      const token = (await loggedIn.json()).token;
      expect((await dashboard).status(), `Real ${name} ${endpoint}`).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator("header").first()).toContainText(school.name);
      const other = fixtures.schools[name === "Alpha" ? "Beta" : "Alpha"];
      await expect(page.locator("body")).not.toContainText(other.name);
      if (previousToken) {
        const revoked = await request.get(`${api}/auth/me`, { headers: { Authorization: `Bearer ${previousToken}` } });
        expect(revoked.status(), "Previous school token remains revoked after account switch").toBe(401);
      }
      await signOut(page);
      expect((await request.get(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
      expect((await request.post(`${api}/auth/refresh`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
      previousToken = token;
    }
    await page.goto(path); await expect(page).toHaveURL(/\/login/);
  });
}

test("real teacher assignment scope: positive controls, reciprocal foreign IDs, spoofed school", async ({ request }) => {
  const a = fixtures.schools.Alpha, b = fixtures.schools.Beta;
  for (const [own, foreign] of [[a, b], [b, a]]) {
    const token = await signIn(request, own, "teacher");
    const headers = { Authorization: `Bearer ${token}` };
    const allowed = await request.get(`${api}/teacher/assignments/${own.assignmentId}`, { headers });
    expect(allowed.status(), "Own assignment positive control").toBe(200);
    const ownBody = await allowed.json(); expect(ownBody.data.id).toBe(own.assignmentId);
    const denied = await request.get(`${api}/teacher/assignments/${foreign.assignmentId}`, { headers });
    expect([403, 404]).toContain(denied.status());
    expect(await denied.text()).not.toContain(foreign.assignmentId);
    const spoofed = await request.get(`${api}/teacher/assignments/${foreign.assignmentId}?school_id=${foreign.id}`, { headers: { ...headers, "X-School-Id": foreign.id } });
    expect([403, 404, 422]).toContain(spoofed.status());
    expect((await request.get(`${api}/admin/dashboard/platform`, { headers })).status()).toBe(403);
  }
});

test("real admin user lookup: own access succeeds and reciprocal foreign-school IDs are denied", async ({ request }) => {
  const a = fixtures.schools.Alpha, b = fixtures.schools.Beta;
  for (const [own, foreign] of [[a, b], [b, a]]) {
    const token = await signIn(request, own, "admin"); const headers = { Authorization: `Bearer ${token}` };
    expect((await request.get(`${api}/admin/users/${own.users.teacher.id}`, { headers })).status()).toBe(200);
    const denied = await request.get(`${api}/admin/users/${foreign.users.teacher.id}`, { headers });
    expect([403, 404]).toContain(denied.status());
    expect(await denied.text()).not.toContain(foreign.users.teacher.username);
    const forged = await request.get(`${api}/admin/dashboard/school?school_id=${foreign.id}`, { headers: { ...headers, "X-School-Id": foreign.id } });
    if (forged.status() === 200) {
      const text = await forged.text(); expect(text).not.toContain(foreign.name);
      expect(text).toContain(own.id);
    } else expect([403, 422]).toContain(forged.status());
  }
});

test("real parent scope: linked child succeeds, unlinked and foreign children are denied", async ({ request }) => {
  const a = fixtures.schools.Alpha, b = fixtures.schools.Beta;
  for (const [own, foreign] of [[a, b], [b, a]]) {
    const token = await signIn(request, own, "parent"); const headers = { Authorization: `Bearer ${token}` };
    expect((await request.get(`${api}/parent/learners/${own.learnerId}/dashboard`, { headers })).status()).toBe(200);
    for (const id of [own.unlinkedLearnerId, foreign.learnerId]) {
      const response = await request.get(`${api}/parent/learners/${id}/dashboard`, { headers });
      expect([403, 404]).toContain(response.status());
      expect(await response.text()).not.toContain(id);
    }
  }
});

test("real refresh rotates token and anonymous dashboards fail closed", async ({ request }) => {
  const token = await signIn(request, fixtures.schools.Alpha, "teacher");
  const refresh = await request.post(`${api}/auth/refresh`, { headers: { Authorization: `Bearer ${token}` } });
  expect(refresh.status()).toBe(200); const next = (await refresh.json()).token;
  expect(next === token).toBe(false);
  expect((await request.get(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
  expect((await request.get(`${api}/auth/me`, { headers: { Authorization: `Bearer ${next}` } })).status()).toBe(200);
  for (const { endpoint } of roleCases) expect((await request.get(`${api}${endpoint}`)).status()).toBe(401);
});
