"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export function SheetContent({ className, side = "right", children, ...props }: ComponentProps<typeof DialogPrimitive.Popup> & { side?: "left" | "right" }) { return <DialogPrimitive.Portal><DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-950/50" /><DialogPrimitive.Viewport className="fixed inset-0 z-50"><DialogPrimitive.Popup className={cn("absolute inset-y-0 w-[min(88vw,22rem)] overflow-y-auto bg-background p-5 shadow-2xl outline-none", side === "left" ? "left-0 border-r" : "right-0 border-l", className)} {...props}>{children}<DialogPrimitive.Close aria-label="Close panel" className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg hover:bg-muted"><X className="size-5" /></DialogPrimitive.Close></DialogPrimitive.Popup></DialogPrimitive.Viewport></DialogPrimitive.Portal>; }
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
