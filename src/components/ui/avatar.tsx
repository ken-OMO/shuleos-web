import Image, { type ImageProps } from "next/image";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Avatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full bg-muted", className)} {...props} />; }
export function AvatarImage({ className, alt = "", ...props }: Omit<ImageProps, "fill">) { return <Image fill sizes="36px" alt={alt} className={cn("object-cover", className)} {...props} />; }
export function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex size-full items-center justify-center bg-primary/12 text-xs font-semibold text-primary", className)} {...props} />; }
