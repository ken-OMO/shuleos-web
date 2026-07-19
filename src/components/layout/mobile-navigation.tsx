"use client";

import Link from "next/link";
import { GraduationCap, Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { navigationForUser } from "@/config/navigation";
import { useAuthStore } from "@/store/auth-store";
export function MobileNavigation() { const user = useAuthStore((state) => state.user); return <Sheet><SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Open navigation" className="lg:hidden" />}><Menu /></SheetTrigger><SheetContent side="left"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap className="size-5" /></span><div><SheetTitle className="font-bold">ShuleOS</SheetTitle><SheetDescription className="text-xs text-muted-foreground">Navigation preview</SheetDescription></div></div><nav className="mt-8" aria-label="Mobile navigation">{navigationForUser(user).map((section) => <div key={section.label} className="mb-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</p>{section.items.map((item) => <SheetClose key={item.title} render={<Link href={item.href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted" />}><item.icon className="size-5 text-muted-foreground" />{item.title}</SheetClose>)}</div>)}</nav></SheetContent></Sheet>; }
