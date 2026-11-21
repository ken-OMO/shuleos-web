import { test, expect } from "@playwright/test";

// Synthetic API responses exercise UI state transitions, not Laravel authorization.
test("school readiness loads independently, recovers from denial, and refreshes the three results", async ({ page }) => {
  const user = { id: "readiness-admin", name: "Readiness Admin", username: "readiness-admin", first_name: "Readiness", last_name: "Admin",
    status: "active", scope: "school", school_id: "school-readiness",
    school: { id: "school-readiness", name: "Readiness School", status: "active", timezone: "Africa/Nairobi", locale: "en" },
    roles: ["School Admin"], permissions: ["view_admin_dashboard", "view_academic_setup_status", "access_administrator_portal"],
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let reads = 0;
  await page.route("http://127.0.0.1:8000/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login") return route.fulfill({ json: { success: true, token: "readiness-token", user, data: { token: "readiness-token", user } } });
    if (path === "/api/auth/me") return route.fulfill({ json: { success: true, data: { user } } });
    if (path === "/api/admin/dashboard/school") return route.fulfill({ json: { success: true, data: { scope: "school", learner_count: 5, teacher_count: 0, profile_completeness: { percentage: 100 } } } });
    if (path === "/api/admin/school/readiness") {
      reads++;
      if (reads === 1) {
        await pending;
        return route.fulfill({ status: 403, json: { success: false, message: "Forbidden" } });
      }
      return route.fulfill({ json: { success: true, data: {
        school_id: "school-readiness", initial_setup: { complete: true, missing: [] },
        academic_configuration: { complete: false, missing: [{ code: "grades_without_learning_areas", count: 1, items: [{ grade_name: "Grade 7" }] }] },
        teaching_coverage: { complete: false, missing: [{ code: "active_teachers" }] },
      } } });
    }
    return route.fulfill({ status: 403, json: { success: false } });
  });
  try {
    await page.goto("/login");
    await page.getByLabel("Username", { exact: true }).fill("readiness-admin");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "School administration", exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Loading school readiness" })).toBeVisible();
    await expect(page.getByText("Profile completeness", { exact: true })).toBeVisible();
    release();
    await expect(page.getByRole("alert").filter({ hasText: "School readiness could not be loaded" })).toBeVisible();
    expect(reads).toBe(1);
    await expect(page.getByRole("heading", { name: "School administration", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("region", { name: "Initial setup", exact: true })).toContainText("Complete");
    await expect(page.getByRole("region", { name: "Academic configuration", exact: true })).toContainText("Grade 7");
    await expect(page.getByRole("region", { name: "Teaching coverage", exact: true })).toContainText("Add active teachers");
    await page.getByRole("button", { name: "Refresh readiness", exact: true }).click();
    await expect.poll(() => reads).toBe(3);
    await page.screenshot({ path: test.info().outputPath("readiness-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("region", { name: "Teaching coverage", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("readiness-mobile.png"), fullPage: true });
  } finally {
    release();
  }
});
