"use client";

import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";

export function RoleGuard({ roles, children, denied }: PropsWithChildren<{ roles: string | string[]; denied?: ReactNode }>) {
  const { isHydrating } = useAuth();
  const values = typeof roles === "string" ? [roles] : roles;
  const allowed = useAuthStore((state) => state.hasAnyRole(values));
  if (isHydrating) return <p role="status">Checking role…</p>;
  return allowed ? children : denied ?? <div role="alert" className="rounded-xl border p-6 text-center"><h2 className="font-semibold">Role access unavailable</h2><p className="mt-2 text-sm text-muted-foreground">This workspace is not available for your authenticated role.</p><Button className="mt-4" variant="outline" render={<Link href="/forbidden" />}>View access information</Button></div>;
}
