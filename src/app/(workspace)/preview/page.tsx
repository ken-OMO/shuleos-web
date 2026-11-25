import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Target } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionCard } from "@/components/dashboard/section-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const metrics = [
  { title: "My learners", value: 87, icon: GraduationCap },
  { title: "Today’s lessons", value: 6, icon: CalendarDays },
  { title: "Lesson plans", value: 24, icon: ClipboardList },
  { title: "Coverage", value: "78%", icon: Target },
];

const lessons = [
  { time: "8:20 AM", subject: "Mathematics", className: "Grade 5M" },
  { time: "9:00 AM", subject: "Kiswahili", className: "Grade 6M" },
  { time: "10:30 AM", subject: "English", className: "Grade 5S" },
];

const previewNavigation = [
  { label: "Overview", href: "#overview" },
  { label: "My learners", href: "#my-learners" },
  { label: "Timetable", href: "#timetable" },
  { label: "Schemes" },
  { label: "Lesson plans", href: "#lesson-plans" },
  { label: "Lesson notes" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Assessment" },
  { label: "Settings" },
];

export default function PreviewPage() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:border-r md:border-b-0">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-brass text-walnut"><GraduationCap className="size-5" /></span>
          ShuleOS
        </Link>
        <nav aria-label="Teacher portal preview" className="mt-6">
          <p className="mb-2 text-xs font-semibold tracking-wider text-brass">TEACHER PORTAL</p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {previewNavigation.map(({ label, href }) => (
              <li key={label}>
                {href ? <a href={href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">{label}</a>
                  : <span aria-disabled="true" className="block px-3 py-2 text-sm text-sidebar-foreground/65">{label}</span>}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main id="overview">
        <PageContainer>
          <PageHeader eyebrow="Teacher workspace" title="Welcome back"
            description="ShuleOS Heritage preview with sample data." actions={<ThemeToggle />} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(metric => (
              <div key={metric.title} id={metric.title === "My learners" ? "my-learners" : metric.title === "Lesson plans" ? "lesson-plans" : undefined} className="scroll-mt-4">
                <KpiCard {...metric} />
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div id="intelligence" className="scroll-mt-4"><SectionCard title="ShuleOS Intelligence" description="Your personal teaching assistant.">
              <div className="rounded-xl border-l-4 border-brass bg-muted p-4">
                <p className="mb-3 text-sm font-medium">Prepare my lessons for today.</p>
                <details>
                  <summary className="w-fit cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Prepare lessons</summary>
                  <p className="mt-3 text-sm text-muted-foreground">Sample preparation checklist</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    <li>Mathematics. Prepare practice questions for Grade 5M.</li>
                    <li>Kiswahili. Choose a reading passage for Grade 6M.</li>
                    <li>English. Prepare a vocabulary exercise for Grade 5S.</li>
                  </ul>
                </details>
              </div>
            </SectionCard></div>
            <div id="timetable" className="scroll-mt-4"><SectionCard title="Today’s timetable">
              <ul className="divide-y">
                {lessons.map(lesson => (
                  <li key={lesson.time} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 py-3 text-sm">
                    <span className="font-medium text-primary">{lesson.time}</span>
                    <div className="flex items-center gap-3">
                      <BookOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <div><p className="font-medium">{lesson.subject}</p><p className="text-muted-foreground">{lesson.className}</p></div>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard></div>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}
