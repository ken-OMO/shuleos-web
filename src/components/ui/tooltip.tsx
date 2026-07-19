"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ className, ...props }: ComponentProps<typeof TooltipPrimitive.Popup>) { return <TooltipPrimitive.Portal><TooltipPrimitive.Positioner sideOffset={6}><TooltipPrimitive.Popup className={cn("z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg", className)} {...props} /></TooltipPrimitive.Positioner></TooltipPrimitive.Portal>; }
