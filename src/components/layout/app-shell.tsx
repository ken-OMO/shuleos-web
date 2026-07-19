"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { CommandPalette } from "@/components/navigation/command-palette";
import { useCommandPalette } from "@/hooks/use-command-palette";
export function AppShell({ children }: PropsWithChildren) { const [collapsed, setCollapsed] = useState(false); const command = useCommandPalette(); useEffect(() => { const frame = window.requestAnimationFrame(() => setCollapsed(window.localStorage.getItem("shuleos-sidebar-collapsed") === "true")); return () => window.cancelAnimationFrame(frame); }, []); const toggle = () => setCollapsed((current) => { const next = !current; window.localStorage.setItem("shuleos-sidebar-collapsed", String(next)); return next; }); return <div className="flex min-h-screen bg-muted/30"><AppSidebar collapsed={collapsed} onToggle={toggle} /><div className="min-w-0 flex-1"><AppHeader onCommand={command.toggle} /><main>{children}</main></div><CommandPalette open={command.open} onOpenChange={command.setOpen} /></div>; }
