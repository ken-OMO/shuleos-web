"use client";

import { Toaster } from "sonner";
import type { PropsWithChildren } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider><AuthBootstrap>{children}</AuthBootstrap></QueryProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}
