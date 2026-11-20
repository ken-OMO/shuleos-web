import { PermissionGuard } from "@/components/auth/permission-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { TeacherTimetableView } from "@/features/teacher/components/teacher-workspace-views";

export default function TeacherTimetablePage() {
  return (
    <RoleGuard roles="Teacher">
      <PermissionGuard permissions="view_own_timetable">
        <TeacherTimetableView />
      </PermissionGuard>
    </RoleGuard>
  );
}
