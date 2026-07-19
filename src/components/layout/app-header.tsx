"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NotificationPanel } from "@/components/navigation/notification-panel";
export function AppHeader({ onCommand }: { onCommand: () => void }) { return <header className="sticky top-0 z-40 flex h-18 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6"><MobileNavigation /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Workspace preview</p><p className="hidden text-xs text-muted-foreground sm:block">Reusable shell foundation</p></div><Button variant="outline" onClick={onCommand} className="hidden min-w-56 justify-start text-muted-foreground md:flex"><Search />Search ShuleOS…<kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[0.65rem]">⌘K</kbd></Button><ThemeToggle /><NotificationPanel /><UserMenu /></header>; }
