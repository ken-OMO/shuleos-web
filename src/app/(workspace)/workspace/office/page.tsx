import { RoleGuard } from "@/components/auth/role-guard";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { SchoolOffice } from "@/features/administrator/components/school-office";
export default function OfficePage() { return <RoleGuard roles="School Secretary"><PermissionGuard permissions={["access_school_office", "view_school_office_summary"]}><SchoolOffice/></PermissionGuard></RoleGuard>; }
