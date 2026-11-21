import { test, expect } from "@playwright/test";

for (const secretary of [false, true]) {
  test(secretary ? "Secretary reaches restricted office without administration or finance" : "dual-role administrator switches to leadership and confirms additional responsibility", async ({ page }) => {
    const user = { id: "alpha-staff", name: "Alpha Staff", username: "staff@example.test", first_name: "Alpha", last_name: "Staff", status: "active", scope: "school", school_id: "alpha", school: { id: "alpha", name: "Alpha School", status: "active", timezone: "Africa/Nairobi", locale: "en" }, roles: secretary ? ["School Secretary"] : ["School Admin", "Headteacher"], permissions: secretary ? ["access_school_office", "view_school_office_summary"] : ["access_administrator_portal", "view_admin_dashboard", "update_school_users", "assign_school_permissions", "access_leadership_portal_phase_two", "view_principal_dashboard"], password_reset_required: false, account: { active: true, locked: false, requires_password_reset: false } };
    let changed = false;
    await page.route("http://127.0.0.1:8000/api/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === "/api/auth/login") return route.fulfill({ json: { success: true, token: "synthetic-token", data: { token: "synthetic-token" } } });
      if (path === "/api/auth/me") return route.fulfill({ json: { success: true, data: { user } } });
      if (path === "/api/school/office") return route.fulfill({ json: { success: true, data: { school_id: "alpha", school_name: "Alpha School", business_forms_available: false } } });
      if (path === "/api/admin/school/staff-access/alpha-staff") { expect(request.postDataJSON()).toEqual({ role: "School Secretary", assigned: true }); changed = true; return route.fulfill({ json: { success: true, data: { school_id: "alpha", user_id: "alpha-staff", role: "School Secretary", assigned: true } } }); }
      if (path === "/api/admin/school/staff-access") return route.fulfill({ json: { success: true, data: { school_id: "alpha", page: 1, last_page: 1, users: [{ id: "alpha-staff", name: "Alpha Staff", primary_role: "School Admin", additional_roles: changed ? ["Headteacher", "School Secretary"] : ["Headteacher"] }] } } });
      if (path === "/api/admin/dashboard/school") return route.fulfill({ json: { success: true, data: { scope: "school" } } });
      if (path === "/api/leadership/dashboard/principal") return route.fulfill({ json: { success: true, data: { role_view: "principal", widgets: {} } } });
      return route.fulfill({ status: 403, json: { success: false } });
    });
    await page.goto("/login");
    await page.getByLabel("School code", { exact: true }).fill("ALPHA");
    await page.getByLabel("Username", { exact: true }).fill("staff@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticPassword123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    if (secretary) {
      await expect(page).toHaveURL(/\/workspace\/office$/);
      await expect(page.getByText("Business forms are currently on hold.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Staff access", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Finance oversight", exact: true })).toHaveCount(0);
    } else {
      await page.getByRole("link", { name: "Staff access", exact: true }).click();
      await page.getByRole("button", { name: "Add School Secretary", exact: true }).click();
      await page.getByRole("button", { name: "Cancel", exact: true }).click(); expect(changed).toBe(false);
      await page.getByRole("button", { name: "Add School Secretary", exact: true }).click();
      await page.getByRole("button", { name: "Confirm", exact: true }).click();
      await expect(page.getByRole("button", { name: "Remove School Secretary", exact: true })).toBeVisible();
      await page.locator("summary").click();
      await page.getByRole("link", { name: "Headteacher / leadership", exact: true }).click();
      await expect(page).toHaveURL(/\/workspace\/leadership$/);
    }
  });
}
