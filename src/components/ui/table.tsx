import type { TableHTMLAttributes, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) { return <div className="w-full overflow-x-auto"><table className={cn("w-full text-sm", className)} {...props} /></div>; }
export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>) { return <thead {...props} />; }
export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) { return <tbody {...props} />; }
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) { return <tr className={cn("border-b transition-colors hover:bg-muted/40", className)} {...props} />; }
export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) { return <th className={cn("h-11 px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)} {...props} />; }
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) { return <td className={cn("p-3", className)} {...props} />; }
