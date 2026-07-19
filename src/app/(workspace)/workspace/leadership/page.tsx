import { ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspacePlaceholder } from "@/components/auth/workspace-placeholder";
export default function LeadershipWorkspacePage() { return <RoleGuard roles={["Principal", "Deputy Principal", "HOD", "Senior Teacher", "Director"]}><WorkspacePlaceholder title="Leadership workspace" description="Leadership dashboards and approvals will be implemented in a later frontend phase." icon={ShieldCheck} /></RoleGuard>; }
