"use client";

import { Suspense, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { LoadingState } from "@/components/feedback/loading-state";

export default function WorkspaceLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  if (pathname === "/preview") return <AppShell>{children}</AppShell>;
  return <Suspense fallback={<LoadingState label="Checking your session" />}><AuthGuard><AppShell>{children}</AppShell></AuthGuard></Suspense>;
}
