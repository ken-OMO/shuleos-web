"use client";

import { useEffect, type PropsWithChildren } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/feedback/loading-state";
import { useAuth } from "@/hooks/use-auth";

export function AuthGuard({ children }: PropsWithChildren) {
  const { status, isAuthenticated, isHydrating } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (isHydrating || isAuthenticated) return;
    const destination = `${pathname}${search.size ? `?${search.toString()}` : ""}`;
    router.replace(`${status === "expired" ? "/session-expired" : "/login"}?redirect=${encodeURIComponent(destination)}`);
  }, [isAuthenticated, isHydrating, pathname, router, search, status]);
  if (isHydrating || !isAuthenticated) return <LoadingState label={status === "expired" ? "Your session has expired" : "Checking your session"} />;
  return children;
}
