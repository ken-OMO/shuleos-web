import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export function WorkspacePlaceholder({ title, description, icon: Icon = Construction }: { title: string; description: string; icon?: LucideIcon }) {
  return <PageContainer><PageHeader eyebrow="Protected workspace" title={title} description={description} /><Card><CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></span><Badge className="mt-5" variant="outline">Authentication integration ready</Badge><h2 className="mt-4 text-xl font-semibold">Portal business pages come next</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">This protected route confirms the authenticated shell and role boundary without displaying invented metrics or school data.</p></CardContent></Card></PageContainer>;
}
