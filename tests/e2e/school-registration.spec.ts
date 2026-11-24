import { test, expect } from "@playwright/test";

test("public registration stays pending until the platform owner explicitly confirms approval", async ({ page }) => {
  const owner = { id: "registration-owner", name: "Platform Owner", username: "owner", first_name: "Platform", last_name: "Owner", status: "active", scope: "platform", school_id: null, school: null,
    roles: ["Platform Owner"], permissions: ["access_administrator_portal", "access_platform_administration", "onboard_schools", "view_platform_dashboard"],
    password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
  let approved = false, approvalCalls = 0, submitted = false;
  await page.route("http://127.0.0.1:8000/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/school-registration-packages") {
      expect(request.headers().authorization).toBeUndefined();
      return route.fulfill({ json: { success: true, data: [{ id: "package-id", package_name: "Basic", description: null, amount: "7100.00", duration_months: 4, features: ["Report cards"] }] } });
    }
    if (path === "/api/school-registration-addon-prices") {
      expect(request.headers().authorization).toBeUndefined();
      return route.fulfill({ json: { success: true, data: [
        { code: "transport", name: "Transport", amount: "1500.00", duration_months: 4 },
      ] } });
    }
    if (path === "/api/school-registration-requests") {
      expect(request.headers().authorization).toBeUndefined(); submitted = true;
      expect(request.postDataJSON()).toMatchObject({ school_name: "Mansoor Academy", package_id: "package-id",
        trial_boarding: false, trial_transport: true, trial_elections: false });
      return route.fulfill({ status: 202, json: { success: true } });
    }
    if (path === "/api/platform/auth/login") return route.fulfill({ status: 202, json: { success: true, data: { authenticated: false, activation_required: false, challenge_id: "review-challenge", challenge_token: "synthetic", expires_in: 600 } } });
    if (path === "/api/platform/auth/verify-otp") return route.fulfill({ json: { success: true, token: "owner-token", user: owner, data: { user: owner, token: "owner-token" } } });
    if (path === "/api/auth/me") return route.fulfill({ json: { success: true, data: { user: owner } } });
    if (path === "/api/admin/dashboard/platform") return route.fulfill({ json: { success: true, data: { scope: "platform", total_schools: 0 } } });
    if (path === "/api/admin/platform/school-registration-requests") return route.fulfill({ json: { success: true, data: { current_page: 1, last_page: 1, total: approved ? 0 : 1, data: approved ? [] : [{ id: "request-id", school_name: "Mansoor Academy", operating_mode: "day", admin_first_name: "Amina", admin_last_name: "Hassan", admin_email: "amina@example.test", status: "pending", requested_package_name: "Basic", trial_transport: true }] } } });
    if (path.endsWith("/request-id/approve")) { approvalCalls++; approved = true; return route.fulfill({ json: { success: true, data: { id: "request-id", status: "approved", school_id: "new-school" } } }); }
    return route.fulfill({ status: 403, json: { success: false } });
  });
  await page.goto("/register-school");
  await page.getByLabel("School name", { exact: true }).fill("Mansoor Academy");
  await page.getByLabel("Administrator first name", { exact: true }).fill("Amina");
  await page.getByLabel("Administrator last name", { exact: true }).fill("Hassan");
  await page.getByLabel("Administrator email", { exact: true }).fill("amina@example.test");
  await page.getByLabel("Operating mode", { exact: true }).selectOption("day");
  await page.getByLabel("Subscription package").selectOption("package-id");
  await expect(page.getByText("Report cards", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Boarding", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Student Council Elections")).not.toBeChecked();
  await page.getByLabel(/Transport.*1,500.*4 months/).check();
  await page.getByRole("button", { name: "Submit registration request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  expect(submitted).toBe(true); expect(approvalCalls).toBe(0);
  await expect(page).toHaveURL(/\/register-school$/);
  await page.getByRole("link", { name: "Return to sign in", exact: true }).click();
  await page.getByLabel("Account type").selectOption("platform");
  await page.getByLabel("Username", { exact: true }).fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await page.getByRole("link", { name: "School registrations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mansoor Academy", exact: true })).toBeVisible();
  await expect(page.getByText("Requested package: Basic")).toBeVisible();
  await expect(page.getByText("Requested add-ons: Transport")).toBeVisible();
  await expect(page.getByRole("button", { name: "Initiate payment", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Allow 14-day trial", exact: true }).click();
  expect(approvalCalls).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(approvalCalls).toBe(0);
  await page.getByRole("button", { name: "Allow 14-day trial", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(page.getByText("No pending requests were returned.", { exact: true })).toBeVisible();
  expect(approvalCalls).toBe(1);
});
