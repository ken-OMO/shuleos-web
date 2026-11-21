"use client";

import { DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useSchoolReadiness } from "../hooks/use-school-readiness";
import { canReadSchoolReadiness, type SchoolReadiness } from "../services/school-readiness-service";

const sections = [
  ["initial_setup", "Initial setup"],
  ["academic_configuration", "Academic configuration"],
  ["teaching_coverage", "Teaching coverage"],
] as const;
const labels: Record<string, string> = {
  school_profile: "Complete the school profile",
  academic_year: "Add an active academic year",
  current_term: "Add an active term",
  grades: "Add active grades",
  streams: "Add active streams",
  active_academic_year: "Add an active academic year",
  term_in_active_academic_year: "Connect an active term to an active academic year",
  active_grades: "Add active grades",
  grades_without_streams: "Grades need active streams",
  grades_without_learning_areas: "Grades need active learning areas",
  terms_without_active_year: "Terms need an active academic year",
  streams_without_active_grade: "Streams need an active grade",
  inactive_learning_area_allocations: "Review learning areas linked to inactive records",
  academic_year_dates: "Review academic year dates",
  term_dates: "Review term dates within their academic year",
  academic_configuration_incomplete: "Complete academic configuration",
  active_teachers: "Add active teachers",
  unassigned_learning_areas: "Learning areas need assigned teachers",
  streams_without_class_teachers: "Streams need class teachers",
};

export function SchoolReadinessResults({ data, loading, failed, refreshing, onRefresh }: {
  data?: SchoolReadiness; loading: boolean; failed: boolean; refreshing: boolean; onRefresh: () => void;
}) {
  return <DashboardSection id="readiness" title="School readiness"
    description="Teaching coverage is separate from the initial setup required for admission."
    action={<Button variant="outline" disabled={refreshing} onClick={onRefresh}>{failed ? "Try again" : "Refresh readiness"}</Button>}>
    {failed ? <p role="alert" className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">School readiness could not be loaded. Try again to get the latest results.</p>
      : loading ? <p role="status" className="p-5 text-sm text-muted-foreground">Loading school readiness...</p>
      : <><p className="mb-4 text-xs text-muted-foreground">Teaching coverage includes all active terms in active academic years.</p>
        <div className="grid gap-4 lg:grid-cols-3">{sections.map(([key, title]) => {
          const result = data?.[key];
          const complete = result?.complete ?? null;
          return <section key={key} aria-label={title} className="rounded-xl border p-4">
            <h3 className="font-semibold">{title}</h3>
            <p className={`mt-2 text-sm font-medium ${complete === true ? "text-primary" : "text-muted-foreground"}`}>
              {complete === null ? "Unavailable" : complete ? "Complete" : "Needs attention"}
            </p>
            {complete === null ? <p className="mt-2 text-sm text-muted-foreground">A valid readiness result was not returned.</p>
              : result && result.missing.length > 0 ? <ul className="mt-3 space-y-3 text-sm">{result.missing.map((issue, index) => <li key={`${issue.code}-${index}`}>
                <p>{labels[issue.code] ?? "An additional prerequisite needs review"}{issue.count !== null ? ` (${issue.count})` : ""}</p>
                {issue.names.length > 0 ? <p className="mt-1 break-words text-xs text-muted-foreground">{issue.names.slice(0, 5).join(", ")}{issue.names.length > 5 ? ", and more" : ""}</p> : null}
              </li>)}</ul>
                : <p className="mt-2 text-sm text-muted-foreground">{complete ? "No missing prerequisites." : "The school has not completed this area."}</p>}
          </section>;
        })}</div></>}
  </DashboardSection>;
}

export function SchoolReadinessSummary() {
  const allowed = useAuthStore(canReadSchoolReadiness);
  const query = useSchoolReadiness();
  if (!allowed) return null;
  return <SchoolReadinessResults data={query.data} loading={query.isPending} failed={query.isError}
    refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />;
}
