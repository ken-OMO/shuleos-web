import { test, expect, type Page } from "@playwright/test";

// Controlled responses matching backend e5199c42; these do not test Laravel authorization.
function identity(name: string, platform = false) {
  return { id: `user-${name}`, name: `${name} Operator`, username: name, first_name: name, last_name: "Operator", email: null,
    status: "active", scope: platform ? "platform" : "school", school_id: platform ? null : `school-${name}`,
    school: platform ? null : { id: `school-${name}`, name: `${name} School`, status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: [platform ? "Platform Owner" : "Teacher"], permissions: [platform ? "view_platform_dashboard" : "access_teacher_portal"],
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
}
async function api(page: Page) {
  const requests: Array<{path: string; auth?: string; body: Record<string, string>}> = [];
  let name = "Alpha";
  let platform = false;
  await page.route("http://127.0.0.1:8000/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api", "");
    const body = req.postDataJSON() ?? {};
    requests.push({ path, auth: req.headers().authorization, body });
    const respond = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    const tokenResponse = () => ({ success: true, token: `token-${name}`, user: identity(name, platform), data: { token: `token-${name}`, user: identity(name, platform) } });
    if (path.endsWith("/login")) {
      name = body.username ?? body.identifier; platform = path.startsWith("/platform");
      if (platform || name === "Activate") return respond({ success: true, data: { authenticated: false, activation_required: !platform, challenge_id: "challenge-1", challenge_token: "challenge-secret", expires_in: 600 } }, 202);
      return respond(tokenResponse());
    }
    if (path.endsWith("verify-otp")) {
      if (body.otp !== "123456") return respond({ success: false, message: "Verification failed." }, 401);
      if (name === "Activate") return respond({ success: true, data: { authenticated: false, activation_required: true, challenge_id: "challenge-1", activation_token: "activation-secret", expires_in: 600 } }, 202);
      return respond(tokenResponse());
    }
    if (path.endsWith("/activate")) return respond(tokenResponse());
    if (path === "/auth/me") return respond({ success: true, data: { user: identity(name, platform) } });
    if (path === "/auth/logout") return respond({ success: true });
    if (path === "/teacher/dashboard") return respond({ success: true, data: { assignments: [{ id: name, name: `${name} private assignment` }], todays_timetable: [], announcements: [], analytics: {} } });
    if (path === "/teacher/tasks") return respond({ success: true, data: [] });
    if (path === "/admin/dashboard/platform") return respond({ success: true, data: { scope: "platform", total_schools: 2 } });
    return respond({ success: false, message: "Unexpected endpoint" }, 404);
  });
  return requests;
}
async function login(page: Page, name: string) {
  await page.getByLabel("Username", { exact: true }).fill(name);
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("two schools: login, role dashboard, logout, account switch, no previous data", async ({ page }) => {
  const requests = await api(page);
  await page.goto("/login"); await login(page, "Alpha");
  await expect(page).toHaveURL(/\/workspace\/teacher$/);
  await expect(page.getByText("Alpha private assignment")).toBeVisible();
  await logout(page);
  await login(page, "Beta");
  await expect(page.getByText("Beta private assignment")).toBeVisible();
  await expect(page.getByText("Alpha private assignment")).toHaveCount(0);
  expect(requests.filter(r => r.path === "/teacher/dashboard").map(r => r.auth)).toEqual(["Bearer token-Alpha", "Bearer token-Beta"]);
  expect(requests.filter(r => r.path === "/auth/logout")[0].auth).toBe("Bearer token-Alpha");
  await logout(page); await page.goto("/workspace/teacher");
  await expect(page).toHaveURL(/\/login/);
});

test("platform OTP login accepts school null and reaches platform dashboard", async ({ page }) => {
  const requests = await api(page); await page.goto("/login");
  await page.getByLabel("Account type").selectOption("platform"); await login(page, "Owner");
  await expect(page.getByRole("heading", { name: "Verify your account" })).toBeVisible();
  expect(requests.some(r => r.path === "/auth/me")).toBe(false);
  await page.getByLabel("Verification code").fill("123456"); await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page).toHaveURL(/\/workspace\/admin\/platform$/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  expect(requests.find(r => r.path === "/platform/auth/login")?.body.identifier).toBe("Owner");
  await logout(page);
});

test("school HTTP 202 stays unauthenticated through invalid OTP then activates", async ({ page }) => {
  const requests = await api(page); await page.goto("/login"); await login(page, "Activate");
  await page.getByLabel("Verification code").fill("000000"); await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByText("Your credentials or session could not be verified.", { exact: true })).toBeVisible();
  await page.getByLabel("Verification code").fill("123456"); await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("heading", { name: "Activate your password" })).toBeVisible();
  expect(requests.some(r => r.path === "/auth/me")).toBe(false);
  await page.getByLabel("New password", { exact: true }).fill("new-password-123");
  await page.getByLabel("Confirm password").fill("new-password-123");
  await page.getByRole("button", { name: "Activate account" }).click();
  await expect(page).toHaveURL(/\/workspace\/teacher$/);
  await expect(page.getByText("Activate private assignment")).toBeVisible();
  expect(requests.find(r => r.path === "/auth/first-login/activate")?.body.activation_token).toBe("activation-secret");
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual({ local: {}, session: {} });
});

test("cancel and reload discard challenges and never fetch a protected dashboard", async ({ page }) => {
  const requests = await api(page); await page.goto("/login"); await login(page, "Activate");
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await login(page, "Activate"); await page.reload();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  expect(requests.some(r => r.path.includes("dashboard") || r.path === "/auth/me")).toBe(false);
});
