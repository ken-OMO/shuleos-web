import { test, expect } from "@playwright/test";

// Synthetic responses test the directory UI; backend tenant/role authorization remains enforced by Laravel.
test("platform owner directory supports retry, pagination, lifecycle filters and a mobile layout without usage claims", async ({ page }) => {
  const user = { id: "directory-owner", name: "Directory Owner", username: "owner", first_name: "Directory", last_name: "Owner", status: "active", scope: "platform", school_id: null, school: null,
    roles: ["Platform Owner"], permissions: ["view_platform_dashboard", "access_administrator_portal", "access_platform_administration", "manage_school_lifecycle"],
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
  const calls: Array<{ page: string | null; state: string | null }> = [];
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const school = (name: string, lifecycle: string) => ({ id: name, school_name: name, school_code: name, lifecycle_state: lifecycle, active: true, created_at: "2026-11-20T08:00:00Z" });
  await page.route("http://127.0.0.1:8000/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/platform/auth/login") return route.fulfill({ status: 202, json: { success: true, data: { authenticated: false, activation_required: false, challenge_id: "directory-challenge", challenge_token: "synthetic-challenge", expires_in: 600 } } });
    if (url.pathname === "/api/platform/auth/verify-otp") return route.fulfill({ json: { success: true, token: "synthetic-owner-token", user, data: { token: "synthetic-owner-token", user } } });
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { success: true, data: { user } } });
    if (url.pathname === "/api/admin/dashboard/platform") return route.fulfill({ json: { success: true, data: { scope: "platform", total_schools: 26 } } });
    if (url.pathname === "/api/admin/platform/schools") {
      calls.push({ page: url.searchParams.get("page"), state: url.searchParams.get("state") });
      if (calls.length === 1) {
        await pending;
        return route.fulfill({ status: 403, json: { success: false, message: "Forbidden" } });
      }
      const state = url.searchParams.get("state"), current = Number(url.searchParams.get("page"));
      const rows = state === "archived" ? [] : state === "onboarding" ? [school("Beta School", "onboarding")] : current === 2 ? [school("Gamma School", "trial")] : [school("Alpha School", "active"), school("Beta School", "onboarding")];
      return route.fulfill({ json: { success: true, data: { data: rows, current_page: current, last_page: state ? 1 : 2, total: state === "archived" ? 0 : state ? 1 : 26 } } });
    }
    return route.fulfill({ status: 403, json: { success: false } });
  });
  try {
    await page.goto("/login");
    await page.getByLabel("Account type").selectOption("platform");
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify code", exact: true }).click();
    await page.getByRole("link", { name: "Schools", exact: true }).click();
    await expect(page).toHaveURL(/\/workspace\/admin\/platform\/schools$/);
    await expect(page.getByRole("status").filter({ hasText: "Loading schools" })).toBeVisible();
    release();
    await expect(page.getByRole("heading", { name: "School directory unavailable" })).toBeVisible();
    expect(calls).toHaveLength(1);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Alpha School", exact: true })).toBeVisible();
    await expect(page.getByText("Registered schools: 26", { exact: true })).toBeVisible();
    await expect(page.getByText("Registration and an Active lifecycle status do not prove current usage.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gamma School", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alpha School", exact: true })).toHaveCount(0);
    await page.getByLabel("Lifecycle status", { exact: true }).selectOption("onboarding");
    await expect(page.getByRole("heading", { name: "Beta School", exact: true })).toBeVisible();
    await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
    expect(calls.at(-1)).toEqual({ page: "1", state: "onboarding" });
    await page.getByLabel("Lifecycle status", { exact: true }).selectOption("archived");
    await expect(page.getByText("No schools match this lifecycle status.", { exact: true })).toBeVisible();
    await page.getByLabel("Lifecycle status", { exact: true }).selectOption("");
    await expect(page.getByRole("heading", { name: "Alpha School", exact: true })).toBeVisible();
    const beforeRefresh = calls.length;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => calls.length).toBe(beforeRefresh + 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "Beta School", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: /Activate|Suspend|Delete|Create school/ })).toHaveCount(0);
  } finally { release(); }
});
