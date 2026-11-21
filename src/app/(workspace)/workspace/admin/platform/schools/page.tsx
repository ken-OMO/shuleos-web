import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { PlatformSchoolsDirectoryView } from "@/features/administrator/components/platform-schools-directory";

export default function PlatformSchoolsPage() {
  return <RoleGuard roles={["Platform Owner", "Platform Super Administrator"]}>
    <PermissionGuard permissions={["access_administrator_portal", "access_platform_administration", "manage_school_lifecycle"]}><PlatformSchoolsDirectoryView /></PermissionGuard>
  </RoleGuard>;
}
