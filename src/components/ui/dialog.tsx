"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Popup>) {
  return <DialogPrimitive.Portal><DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-walnut/55 backdrop-blur-xs transition-opacity" /><DialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"><DialogPrimitive.Popup className={cn("surface-card relative w-full max-w-lg rounded-2xl border bg-popover p-6 text-popover-foreground outline-none", className)} {...props}>{children}<DialogPrimitive.Close aria-label="Close dialog" className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></DialogPrimitive.Close></DialogPrimitive.Popup></DialogPrimitive.Viewport></DialogPrimitive.Portal>;
}
export function DialogHeader({ className, ...props }: ComponentProps<"div">) { return <div className={cn("mb-4 space-y-1.5", className)} {...props} />; }
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />; }
export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) { return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />; }
