import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { TeacherTasksView } from "@/features/teacher/components/teacher-workspace-views";

export default function TeacherTasksPage() {
  return (
    <RoleGuard roles="Teacher">
      <PermissionGuard permissions="access_teacher_portal">
        <TeacherTasksView />
      </PermissionGuard>
    </RoleGuard>
  );
}
