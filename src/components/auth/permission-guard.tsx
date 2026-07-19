"use client";

import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";

export function PermissionGuard({ permissions, mode = "all", children, denied }: PropsWithChildren<{ permissions: string | string[]; mode?: "all" | "any"; denied?: ReactNode }>) {
  const { isHydrating } = useAuth();
  const values = typeof permissions === "string" ? [permissions] : permissions;
  const allowed = useAuthStore((state) => mode === "all" ? values.every(state.hasPermission) : state.hasAnyPermission(values));
  if (isHydrating) return <p role="status">Checking permission…</p>;
  return allowed ? children : denied ?? <AccessDenied />;
}

function AccessDenied() { return <div role="alert" className="rounded-xl border p-6 text-center"><h2 className="font-semibold">Access unavailable</h2><p className="mt-2 text-sm text-muted-foreground">Your account does not have access to this area.</p><Button className="mt-4" variant="outline" render={<Link href="/forbidden" />}>View access information</Button></div>; }
