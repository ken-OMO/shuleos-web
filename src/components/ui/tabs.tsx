"use client";

import { createContext, useContext, useState, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const TabsContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null);
export function Tabs({ defaultValue, className, ...props }: HTMLAttributes<HTMLDivElement> & { defaultValue: string }) { const [value, setValue] = useState(defaultValue); return <TabsContext.Provider value={{ value, setValue }}><div className={className} {...props} /></TabsContext.Provider>; }
export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div role="tablist" className={cn("inline-flex rounded-lg bg-muted p-1", className)} {...props} />; }
export function TabsTrigger({ value, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) { const context = useContext(TabsContext)!; const selected = context.value === value; return <button role="tab" aria-selected={selected} onClick={() => context.setValue(value)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", selected ? "bg-background shadow-sm" : "text-muted-foreground", className)} {...props} />; }
export function TabsContent({ value, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) { const context = useContext(TabsContext)!; return context.value === value ? <div role="tabpanel" className={cn("mt-4", className)} {...props} /> : null; }
