import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) { return <select ref={ref} className={cn("h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20", className)} {...props} />; });
