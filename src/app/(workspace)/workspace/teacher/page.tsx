import { BookOpen } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspacePlaceholder } from "@/components/auth/workspace-placeholder";
export default function TeacherWorkspacePage() { return <RoleGuard roles="Teacher"><WorkspacePlaceholder title="Teacher workspace" description="Teaching workflows and classroom information will be implemented in a later frontend phase." icon={BookOpen} /></RoleGuard>; }
