"use client";

import { Menu } from "@base-ui/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export const DropdownMenu = Menu.Root;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({ className, align = "start", ...props }: ComponentProps<typeof Menu.Popup> & { align?: ComponentProps<typeof Menu.Positioner>["align"] }) { return <Menu.Portal><Menu.Positioner className="z-50" sideOffset={8} align={align}><Menu.Popup className={cn("z-50 min-w-48 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-sm outline-none", className)} {...props} /></Menu.Positioner></Menu.Portal>; }
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) { return <Menu.Item className={cn("flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted", className)} {...props} />; }
export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.GroupLabel>) { return <Menu.GroupLabel className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", className)} {...props} />; }
