import { Settings } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspacePlaceholder } from "@/components/auth/workspace-placeholder";
export default function AdminWorkspacePage() { return <RoleGuard roles={["Platform Owner", "Platform Super Administrator", "School Admin", "Administrator"]}><WorkspacePlaceholder title="Administration workspace" description="The administration portal interface will be implemented in a later frontend phase." icon={Settings} /></RoleGuard>; }
