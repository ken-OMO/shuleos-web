import { UsersRound } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspacePlaceholder } from "@/components/auth/workspace-placeholder";
export default function ParentWorkspacePage() { return <RoleGuard roles="Parent"><WorkspacePlaceholder title="Parent workspace" description="Linked learner information and parent services will be implemented in a later frontend phase." icon={UsersRound} /></RoleGuard>; }
