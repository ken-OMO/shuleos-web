import { test, expect } from "@playwright/test";

test("email and school code activate only the chosen school, then administrator invitations carry no tenant overrides", async ({ page }) => {
  const user = { id: "alpha-admin", name: "Alpha Admin", username: "same@example.test", first_name: "Alpha", last_name: "Admin", status: "active", scope: "school", school_id: "alpha", school: { id: "alpha", name: "Alpha School", status: "active", timezone: "Africa/Nairobi", locale: "en" }, roles: ["School Admin"], permissions: ["access_administrator_portal", "view_school_admin_dashboard", "view_admin_dashboard", "create_school_users", "activate_school_users"], password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
  let invitationCalls = 0, resendCalls = 0;
  await page.route("http://127.0.0.1:8000/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : null;
    if (path === "/api/auth/login") {
      expect(body.school_code).toBe("ALPHA"); expect(body.username).toBe("same@example.test");
      return route.fulfill({ status: 202, json: { success: true, data: { authenticated: false, school_id: "alpha", challenge_id: "alpha-challenge", challenge_token: "synthetic", expires_in: 600 } } });
    }
    if (path === "/api/auth/first-login/verify-otp") return route.fulfill({ status: 202, json: { success: true, data: { authenticated: false, school_id: "alpha", challenge_id: "alpha-challenge", activation_token: "synthetic-activation", expires_in: 600 } } });
    if (path === "/api/auth/first-login/activate") return route.fulfill({ json: { success: true, token: "synthetic-token", data: { token: "synthetic-token" } } });
    if (path === "/api/auth/me") return route.fulfill({ json: { success: true, data: { user } } });
    if (path === "/api/admin/dashboard/school") return route.fulfill({ json: { success: true, data: { scope: "school" } } });
    if (path === "/api/admin/school/user-invitations/roles") return route.fulfill({ json: { success: true, data: { roles: [{ id: "teacher-role", name: "Teacher" }] } } });
    if (path === "/api/admin/school/user-invitations" && request.method() === "GET") return route.fulfill({ json: { success: true, data: { school_id: "alpha", school_code: "ALPHA", pending: invitationCalls ? [{ id: "teacher-id", first_name: "Test", last_name: "Teacher", email: "teacher@example.test" }] : [] } } });
    if (path === "/api/admin/school/user-invitations") {
      expect(body).toEqual({ first_name: "Test", last_name: "Teacher", email: "teacher@example.test", role_id: "teacher-role" }); invitationCalls++;
      return route.fulfill({ status: 201, json: { success: true, data: { id: "teacher-id", status: "pending_activation" } } });
    }
    if (path.endsWith("/teacher-id/resend")) { expect(body).toEqual({}); resendCalls++; return route.fulfill({ json: { success: true, data: { id: "teacher-id", status: "pending_activation" } } }); }
    return route.fulfill({ status: 403, json: { success: false } });
  });
  await page.goto("/login");
  await page.getByLabel("School code", { exact: true }).fill("ALPHA");
  await page.getByLabel("Username", { exact: true }).fill("same@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-temp");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  const password = page.getByLabel("New password", { exact: true });
  await expect(page.getByRole("button", { name: "Activate account", exact: true })).toBeDisabled();
  await password.fill("PermanentSyntheticPass123!");
  await page.getByLabel("Confirm password", { exact: true }).fill("PermanentSyntheticPass123!");
  await page.getByLabel("Show password", { exact: true }).check();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByLabel("Show password", { exact: true }).uncheck();
  await expect(password).toHaveAttribute("type", "password");
  await expect(page.locator("#activation-password-checks")).not.toContainText("Not met");
  await page.getByRole("button", { name: "Activate account", exact: true }).click();
  await page.getByRole("link", { name: "Invite school users", exact: true }).click();
  await expect(page.getByText("School code:", { exact: false })).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("Last name", { exact: true }).fill("Teacher");
  await page.getByLabel("Email / username", { exact: true }).fill("teacher@example.test");
  await page.getByLabel("School role", { exact: true }).selectOption("teacher-role");
  await page.getByRole("button", { name: "Send invitation", exact: true }).click();
  await expect(page.getByText("User invitation created.", { exact: false })).toBeVisible();
  expect(invitationCalls).toBe(1);
  await page.getByRole("button", { name: "Resend invitation", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click(); expect(resendCalls).toBe(0);
  await page.getByRole("button", { name: "Resend invitation", exact: true }).click();
  await page.getByRole("button", { name: "Confirm resend", exact: true }).click();
  await expect(page.getByText("Replacement invitation created.", { exact: false })).toBeVisible(); expect(resendCalls).toBe(1);
});
