import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav aria-label="Home navigation" className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span className="grid size-10 place-items-center rounded-xl bg-brass text-walnut"><GraduationCap className="size-5" /></span>
            ShuleOS
          </Link>
          <div className="text-brass"><ThemeToggle /></div>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="border-l-4 border-brass pl-5 sm:pl-8">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">The Intelligent School Operating System</h1>
          <p className="mt-5 text-lg text-muted-foreground">Less paperwork. More teaching. Better learning.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/login" />}>Sign in</Button>
            <Button nativeButton={false} variant="outline" render={<Link href="/register-school" />}>Register your school</Button>
            <Button nativeButton={false} variant="ghost" className="text-primary" render={<Link href="/preview" />}>Explore teacher preview</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
