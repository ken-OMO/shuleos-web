"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) { return <SwitchPrimitive.Root className={cn("relative h-6 w-11 rounded-full bg-input transition-colors data-[checked]:bg-primary", className)} {...props}><SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-5" /></SwitchPrimitive.Root>; }
