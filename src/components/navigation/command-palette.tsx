"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { navigationForUser } from "@/config/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const user = useAuthStore((state) => state.user);
  const sections = useMemo(() => navigationForUser(user).map((section) => ({ ...section, items: section.items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())) })).filter((section) => section.items.length), [query, user]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl p-0"><DialogHeader className="sr-only"><DialogTitle>Command palette</DialogTitle><DialogDescription>Search available ShuleOS navigation commands.</DialogDescription></DialogHeader><div className="flex items-center border-b px-4"><Search className="size-4 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search navigation…" aria-label="Search commands" className="h-13 border-0 shadow-none focus-visible:ring-0" /></div><div className="max-h-[55vh] overflow-y-auto p-2">{sections.length ? sections.map((section) => <div key={section.label} className="mb-2"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</p>{section.items.map((item) => <Link key={item.title} href={item.href} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted focus-visible:bg-muted"><item.icon className="size-4 text-muted-foreground" />{item.title}</Link>)}</div>) : <p className="p-8 text-center text-sm text-muted-foreground">No matching navigation commands.</p>}<div className="border-t px-3 py-3 text-xs text-muted-foreground">Record search will connect to an authorized API in a later phase.</div></div></DialogContent></Dialog>;
}
