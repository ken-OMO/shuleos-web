import { GraduationCap } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspacePlaceholder } from "@/components/auth/workspace-placeholder";
export default function LearnerWorkspacePage() { return <RoleGuard roles="Learner"><WorkspacePlaceholder title="Learner workspace" description="Learning activities and learner services will be implemented in a later frontend phase." icon={GraduationCap} /></RoleGuard>; }
