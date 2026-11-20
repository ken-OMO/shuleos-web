import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { TeacherAssignmentsView } from "@/features/teacher/components/teacher-workspace-views";

export default function TeacherAssignmentsPage() {
  return (
    <RoleGuard roles="Teacher">
      <PermissionGuard permissions="view_own_teacher_assignments">
        <TeacherAssignmentsView />
      </PermissionGuard>
    </RoleGuard>
  );
}
