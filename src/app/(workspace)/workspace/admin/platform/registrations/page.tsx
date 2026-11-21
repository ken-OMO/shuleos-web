import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { RegistrationReview } from "@/features/registration/registration-review";

export default function SchoolRegistrationReviewPage() {
  return <RoleGuard roles={["Platform Owner", "Platform Super Administrator"]}><PermissionGuard permissions={["access_administrator_portal", "access_platform_administration", "onboard_schools"]}><RegistrationReview /></PermissionGuard></RoleGuard>;
}
