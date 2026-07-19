import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) { return <textarea ref={ref} className={cn("min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20", className)} {...props} />; });
