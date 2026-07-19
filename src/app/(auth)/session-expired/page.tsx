import Link from "next/link";
import { ClockAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SessionExpiredPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await searchParams;
  const destination = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  return <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><ClockAlert /></span><h1 className="mt-6 text-3xl font-bold tracking-tight">Your session has expired.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">For your security, ShuleOS cleared private session data. Sign in again to continue.</p><Button className="mt-7 w-full" size="lg" render={<Link href={destination} />}>Return to sign in</Button></div>;
}
