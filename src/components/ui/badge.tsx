import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = { default: "bg-primary/12 text-primary", secondary: "bg-secondary text-secondary-foreground", success: "bg-success/12 text-success", warning: "bg-warning/15 text-warning", information: "bg-information/12 text-information", destructive: "bg-destructive/12 text-destructive", outline: "border bg-transparent text-foreground" };
export function Badge({ className, variant = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) { return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant], className)} {...props} />; }
