"use client";

import { Search } from "lucide-react";
import { MobileNavigation } from "./mobile-navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationPanel } from "@/components/navigation/notification-panel";
import { UserMenu } from "./user-menu";
import { useAuthStore } from "@/store/auth-store";

export function AppHeader({ onCommand }: { onCommand: () => void }) {
  const user = useAuthStore((state) => state.user);
  return <header className="sticky top-0 z-40 flex h-18 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6"><MobileNavigation/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.school.name ?? "ShuleOS workspace"}</p><p className="hidden text-xs text-muted-foreground sm:block">{user?.roles.map((role)=>role.name).join(" · ") || "Authenticated workspace"}</p></div><Button variant="outline" onClick={onCommand} className="hidden min-w-56 justify-start text-muted-foreground md:flex"><Search/>Search navigation…<kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[0.65rem]">Ctrl K</kbd></Button><ThemeToggle/><NotificationPanel empty/><UserMenu/></header>;
}
