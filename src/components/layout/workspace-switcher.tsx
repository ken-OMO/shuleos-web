"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { workspaceOptions } from "@/features/dashboard/workspace-options";

export function WorkspaceSwitcher() {
  const user = useAuthStore(state => state.user);
  const pathname = usePathname();
  const options = workspaceOptions(user);
  if (options.length < 2) return null;
  return <details className="relative"><summary className="cursor-pointer rounded border px-2 py-1 text-xs">Workspace</summary><nav aria-label="Switch workspace" className="absolute right-0 top-full z-50 mt-2 grid w-56 gap-1 rounded border bg-background p-2 text-sm shadow-lg">{options.map(option => <Link key={option.href} href={option.href} aria-current={pathname === option.href ? "page" : undefined} className="rounded border px-2 py-1 aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground">{option.label}</Link>)}</nav></details>;
}
