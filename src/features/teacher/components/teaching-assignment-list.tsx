import Link from "next/link";
import { teacherAssignmentLabel } from "../services/teacher-assignment-label";

function name(value: unknown, key?: string): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (key && value && typeof value === "object" && key in value) {
    return name((value as Record<string, unknown>)[key]);
  }
  return null;
}

export function TeachingAssignmentList({ active, upcoming, weeklyLoad }: {
  active: Record<string, unknown>[];
  upcoming: Record<string, unknown>[];
  weeklyLoad?: number | null;
}) {
  if (!active.length && !upcoming.length) {
    return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No active or upcoming teaching assignments.</p>;
  }

  return <div className="space-y-4">
    {[{ title: "Active", items: active }, { title: "Upcoming", items: upcoming }].map(group => (
      <section key={group.title}>
        <h3 className="text-sm font-semibold">{group.title}</h3>
        {group.title === "Active" && active.length > 0 && weeklyLoad != null &&
          <p className="mt-1 text-xs text-muted-foreground">{weeklyLoad} lessons per week</p>}
        {group.items.length ? <ul className="mt-1 divide-y">
          {group.items.map((assignment, index) => {
            const period = [
              name(assignment.academic_year, "year_name"),
              name(assignment.term, "term_name"),
            ].filter(Boolean);
            const lessons = assignment.lessons_per_week;
            if ((typeof lessons === "number" || typeof lessons === "string") &&
                String(lessons).trim() && Number.isFinite(Number(lessons))) {
              period.push(`${lessons} lessons per week`);
            }
            if (typeof assignment.learner_count === "number") period.push(`${assignment.learner_count} learners`);
            return <li key={String(assignment.id ?? index)} className="py-2">
              <p className="text-sm font-medium">{teacherAssignmentLabel(assignment) ?? name(assignment.title) ?? "Teaching assignment"}</p>
              {period.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{period.join(" · ")}</p>}
            </li>;
          })}
        </ul> : <p className="mt-1 text-sm text-muted-foreground">No {group.title.toLowerCase()} assignments.</p>}
      </section>
    ))}
    {active.length > 0 && <Link href="/workspace/teacher/learners" className="text-sm font-medium text-primary hover:underline">View learners</Link>}
  </div>;
}
