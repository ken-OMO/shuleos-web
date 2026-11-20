"use client";

import Link from "next/link";
import { type PropsWithChildren, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { UnknownRecord } from "@/features/dashboard/dashboard-contract";

export function DashboardPage({ children }: PropsWithChildren) { return <PageContainer className="space-y-6 pb-12">{children}</PageContainer>; }

function ClientDate() {
  const label = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <span suppressHydrationWarning>{label}</span>;
}

export function DashboardHeader({ title, description, role, lastRefreshedAt, refreshing, onRefresh }: { title: string; description: string; role: string; lastRefreshedAt?: string | null; refreshing?: boolean; onRefresh?: () => void }) {
  const user = useAuthStore((state) => state.user);
  return <header className="sticky top-0 z-10 -mx-4 border-b bg-background/92 px-4 py-5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{user?.school?.name}</span><span aria-hidden>•</span><span>{role}</span><span aria-hidden>•</span><ClientDate /></div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div><div className="flex items-center gap-3"><DashboardDataFreshness value={lastRefreshedAt} />{onRefresh ? <Button variant="outline" onClick={onRefresh} disabled={refreshing}><RefreshCw className={cn("size-4", refreshing && "animate-spin")} />Refresh</Button> : null}</div></div></header>;
}

export function DashboardWelcomeCard({ focus }: { focus: string }) { const user=useAuthStore((s)=>s.user); return <Card className="overflow-hidden border-primary/20 bg-primary/[0.045]"><CardContent className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-primary">Welcome back</p><h2 className="mt-1 text-xl font-semibold">{user?.displayName}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{focus}</p></div><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><CheckCircle2 className="size-6" /></span></CardContent></Card>; }

export function DashboardKpiGrid({ children }: PropsWithChildren) { return <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>; }
export function DashboardKpiCard({ label, value, detail, icon: Icon, loading=false }: { label:string; value:string|number|null; detail?:string; icon:LucideIcon; loading?:boolean }) { return <Card><CardContent className="p-5">{loading?<Skeleton className="h-20 w-full"/>:<><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value===null?<span className="text-base font-medium text-muted-foreground">Unavailable</span>:value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5"/></span></div>{detail?<p className="mt-4 text-xs text-muted-foreground">{detail}</p>:null}</>}</CardContent></Card>; }

export function DashboardSection({ id, title, description, action, children, className }: PropsWithChildren<{id?:string;title:string;description?:string;action?:ReactNode;className?:string}>) { return <Card id={id} className={cn("scroll-mt-28",className)}><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>{title}</CardTitle>{description?<CardDescription>{description}</CardDescription>:null}</div>{action}</CardHeader><CardContent>{children}</CardContent></Card>; }

export function DashboardActionCard({ title, description, href, icon:Icon }: {title:string;description:string;href:string;icon:LucideIcon}) { return <Link href={href} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4"/></span><div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"/></div></Link>; }

export interface QuickAction { title:string;description:string;href:string;icon:LucideIcon;permission?:string;excludeRoles?:string[] }
export function DashboardQuickActions({ actions }: {actions:QuickAction[]}) { const user=useAuthStore((s)=>s.user); const permissions=new Set(user?.permissions.map((p)=>p.name)); const roles=new Set(user?.roles.map((r)=>r.name.toLowerCase())); const visible=actions.filter((a)=>(!a.permission||permissions.has(a.permission))&&!(a.excludeRoles??[]).some((r)=>roles.has(r.toLowerCase()))); if(!visible.length)return null; return <DashboardSection title="Quick actions" description="Shortcuts available for your current access."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{visible.map((action)=><DashboardActionCard key={action.title}{...action}/>)}</div></DashboardSection>; }

function text(item:UnknownRecord,...keys:string[]){for(const key of keys){if(typeof item[key]==="string"&&item[key])return String(item[key]);}return null;}
function DashboardList({ items, empty, kind }: {items:UnknownRecord[];empty:string;kind:"task"|"alert"|"activity"}) { if(!items.length)return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>; return <ul className="divide-y">{items.slice(0,10).map((item,index)=>{const title=text(item,"title","action","subject","type")??`${kind[0].toUpperCase()}${kind.slice(1)} ${index+1}`;const detail=text(item,"explanation","description","message","module");const status=text(item,"severity","status","type");const time=text(item,"created_at","due_at","updated_at");return <li key={String(item.id??item.key??index)} className="flex items-start gap-3 py-3"><span className={cn("mt-0.5 grid size-8 place-items-center rounded-lg",kind==="alert"?"bg-amber-500/10 text-amber-700":"bg-muted text-muted-foreground")}>{kind==="alert"?<AlertTriangle className="size-4"/>:<Clock3 className="size-4"/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{title}</p>{status?<Badge variant="secondary">{status}</Badge>:null}</div>{detail?<p className="mt-1 text-xs text-muted-foreground">{detail}</p>:null}{time?<p className="mt-1 text-xs text-muted-foreground">{time}</p>:null}</div></li>;})}</ul>; }
export function DashboardTaskList({items}:{items:UnknownRecord[]}){return <DashboardList items={items} kind="task" empty="No current tasks were returned."/>;}
export function DashboardAlertList({items}:{items:UnknownRecord[]}){return <DashboardList items={items} kind="alert" empty="No active alerts were returned."/>;}
export function DashboardActivityList({items}:{items:UnknownRecord[]}){return <DashboardList items={items} kind="activity" empty="No recent activity was returned."/>;}

export function DashboardDataFreshness({value}:{value?:string|null}) { const date=value?new Date(value):null; const label=date&&!Number.isNaN(date.valueOf())?`Updated ${new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(date)}`:"Update time unavailable"; return <span suppressHydrationWarning className="text-xs text-muted-foreground" aria-live="polite">{label}</span>; }
export function DashboardMobileSummary({items}:{items:Array<{label:string;value:string|number|null}>}){return <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">{items.map((item)=><div key={item.label} className="min-w-32 rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-semibold">{item.value??"Unavailable"}</p></div>)}</div>;}
export function DashboardUnavailableState({title="Dashboard unavailable",description="The server could not provide this dashboard for your current access.",onRetry}:{title?:string;description?:string;onRetry?:()=>void}){return <div role="alert" className="rounded-xl border border-dashed p-8 text-center"><AlertTriangle className="mx-auto size-7 text-amber-600"/><h2 className="mt-3 font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>{onRetry?<Button variant="outline" className="mt-4" onClick={onRetry}>Try again</Button>:null}</div>;}
export function DashboardHeaderSkeleton(){return <div role="status" aria-label="Loading dashboard" className="space-y-4"><Skeleton className="h-9 w-72"/><Skeleton className="h-4 w-full max-w-xl"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4},(_,i)=><Skeleton key={i} className="h-32"/>)}</div></div>;}
export function DashboardEmptyCalendar({ message = "No scheduled items were returned for today." }: { message?: string }){return <div className="flex items-center gap-3 rounded-lg border border-dashed p-5 text-sm text-muted-foreground"><CalendarDays className="size-5"/>{message}</div>;}
