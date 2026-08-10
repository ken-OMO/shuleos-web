"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/feedback/loading-state";
import { workspacePathForRoles } from "../dashboard-policy";
import { useAuthStore } from "@/store/auth-store";

export function WorkspaceRedirect() {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles.map((role) => role.name));
  useEffect(() => { router.replace(workspacePathForRoles(roles)); }, [roles, router]);
  return <LoadingState label="Opening your workspace" />;
}
