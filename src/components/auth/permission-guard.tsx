"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export function PermissionGuard({ permission, children, denied }: PropsWithChildren<{ permission: string; denied?: ReactNode }>) {
  const { status, hasPermission } = useAuth();
  if (status === "hydrating" || status === "authenticating") return <p role="status">Checking permission…</p>;
  return hasPermission(permission) ? children : denied ?? <p role="alert">You do not have permission to view this content.</p>;
}
