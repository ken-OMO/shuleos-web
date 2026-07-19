import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div role="alert" className={cn("rounded-xl border bg-card p-4 text-sm", className)} {...props} />; }
export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h5 className={cn("mb-1 font-semibold", className)} {...props} />; }
export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("text-muted-foreground", className)} {...props} />; }
