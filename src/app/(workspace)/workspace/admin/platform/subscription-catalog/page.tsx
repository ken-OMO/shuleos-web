import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { SubscriptionCatalog } from "@/features/registration/subscription-catalog";

export default function SubscriptionCatalogPage() {
  return <RoleGuard roles={["Platform Owner"]}>
    <PermissionGuard permissions={["access_administrator_portal", "access_platform_administration"]}>
      <SubscriptionCatalog />
    </PermissionGuard>
  </RoleGuard>;
}
