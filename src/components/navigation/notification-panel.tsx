"use client";

import { Bell, CalendarClock, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";

export interface NotificationPreview { id: string; category: string; title: string; timestamp: string; unread: boolean }
const previews: NotificationPreview[] = [
  { id: "preview-1", category: "Academic", title: "Term planning review", timestamp: "Static preview · 10 min", unread: true },
  { id: "preview-2", category: "Timetable", title: "Lessons overview prepared", timestamp: "Static preview · 1 hr", unread: false },
];

export function NotificationPanel({ empty = false }: { empty?: boolean }) { const items = empty ? [] : previews; return <Sheet><SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Open notification preview" className="relative" />}><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" /></SheetTrigger><SheetContent><div className="pr-10"><SheetTitle className="text-lg font-semibold">Notifications</SheetTitle><SheetDescription className="mt-1 text-sm text-muted-foreground">Local presentation data only. No live API is connected.</SheetDescription></div><div className="mt-6 space-y-3">{items.length ? items.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">{item.unread ? <CalendarClock className="size-4" /> : <CheckCircle2 className="size-4" />}</span><Badge variant={item.unread ? "default" : "secondary"}>{item.category}</Badge></div><h3 className="mt-3 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.timestamp}</p></article>) : <EmptyState title="You’re all caught up" description="New notifications will appear here after a future API integration." />}</div></SheetContent></Sheet>; }
