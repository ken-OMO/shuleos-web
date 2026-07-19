"use client";

import { useEffect, type PropsWithChildren } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/feedback/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { authLandingFor, safeInternalRedirect } from "@/services/auth/auth-routing";

export function GuestGuard({ children }: PropsWithChildren) {
  const { isAuthenticated, isHydrating, user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  useEffect(() => {
    if (isAuthenticated && user) router.replace(safeInternalRedirect(search.get("redirect"), authLandingFor(user)));
  }, [isAuthenticated, router, search, user]);
  if (isHydrating || isAuthenticated) return <LoadingState label="Preparing your session" />;
  return children;
}
