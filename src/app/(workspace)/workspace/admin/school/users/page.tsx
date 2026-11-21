import { RoleGuard } from "@/components/auth/role-guard";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { SchoolUserInvitations } from "@/features/administrator/components/school-user-invitations";
import { invitationPermissions } from "@/features/administrator/services/school-user-invitation-service";

export default function SchoolUsersPage() {
  return <RoleGuard roles={["School Admin", "Administrator", "Director", "School Owner"]}><PermissionGuard permissions={invitationPermissions}><SchoolUserInvitations /></PermissionGuard></RoleGuard>;
}
