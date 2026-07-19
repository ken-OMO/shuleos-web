"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export function RoleGuard({ role, children, denied }: PropsWithChildren<{ role: string; denied?: ReactNode }>) {
  const { status, hasRole } = useAuth();
  if (status === "hydrating" || status === "authenticating") return <p role="status">Checking role…</p>;
  return hasRole(role) ? children : denied ?? <p role="alert">Your role cannot access this content.</p>;
}
