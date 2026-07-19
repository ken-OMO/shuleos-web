import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function ResponsiveGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)} {...props} />; }
