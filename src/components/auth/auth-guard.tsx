"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/feedback/loading-state";

export function AuthGuard({ children, denied }: PropsWithChildren<{ denied?: ReactNode }>) {
  const { status } = useAuth();
  if (status === "hydrating" || status === "authenticating") return <LoadingState label="Checking your session" />;
  if (status !== "authenticated") return denied ?? <p role="alert">Sign in is required to view this area.</p>;
  return children;
}
