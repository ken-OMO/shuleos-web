import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8", className)} {...props} />; }
