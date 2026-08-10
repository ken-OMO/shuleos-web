"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function NotificationPanel({ empty = true }: { empty?: boolean }) {
  return <Sheet><SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Open notifications"/>}><Bell/></SheetTrigger><SheetContent data-empty={empty}><div className="pr-10"><SheetTitle className="text-lg font-semibold">Notifications</SheetTitle><SheetDescription className="mt-1 text-sm text-muted-foreground">Your notification inbox will appear here when its authorized API is connected.</SheetDescription></div><div className="mt-6"><EmptyState title="No notifications loaded" description="This panel does not display sample or fabricated notification records."/></div></SheetContent></Sheet>;
}
