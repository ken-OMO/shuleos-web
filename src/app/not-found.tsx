import Link from "next/link";
import { Compass, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main className="grid min-h-screen place-items-center p-6"><div className="max-w-lg text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><GraduationCap /></span><p className="mt-8 text-sm font-semibold uppercase tracking-wider text-primary">404 · Page not found</p><h1 className="mt-3 text-4xl font-bold tracking-tight">This page is not in the timetable.</h1><p className="mt-4 text-muted-foreground">The address may have changed, or this workspace has not been built yet.</p><Button nativeButton={false} className="mt-7" render={<Link href="/"  />}><Compass />Return home</Button></div></main>; }

