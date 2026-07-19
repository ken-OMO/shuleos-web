import type { HTMLAttributes, OlHTMLAttributes } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function Breadcrumb(props: HTMLAttributes<HTMLElement>) { return <nav aria-label="Breadcrumb" {...props} />; }
export function BreadcrumbList({ className, ...props }: OlHTMLAttributes<HTMLOListElement>) { return <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground", className)} {...props} />; }
export function BreadcrumbItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) { return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />; }
export function BreadcrumbSeparator() { return <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>; }
