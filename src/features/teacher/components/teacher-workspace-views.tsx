"use client";

import Link from "next/link";
import { TeachingAssignmentList } from "./teaching-assignment-list";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardEmptyCalendar,
  DashboardHeader,
  DashboardHeaderSkeleton,
  DashboardPage,
  DashboardSection,
  DashboardUnavailableState,
} from "@/components/dashboard/dashboard-primitives";
import {
  useTeacherAssignments,
  useTeacherTasks,
  useTeacherTimetable,
} from "../hooks/use-teacher-dashboard";
import type {
  TeacherTask,
  TeacherTimetableEntry,
} from "../types/workspace";

function TaskList({ tasks }: { tasks: TeacherTask[] }) {
  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <CheckCircle2 className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-3 font-medium">No current tasks</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The teacher workflow did not return any pending work.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {tasks.map((task, index) => (
        <li
          key={`${task.task_type}-${task.entity_reference ?? index}`}
          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <ClipboardList className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{task.title}</p>
              <Badge variant="secondary">{task.status}</Badge>
              <Badge variant="outline">{task.priority}</Badge>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {task.task_type}
            </p>
          </div>

          {task.deep_link ? (
            <Button variant="outline" size="sm" nativeButton={false} render={
              <Link href={task.deep_link} />
            }>
              Open task
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TeacherTasksView() {
  const query = useTeacherTasks();

  if (query.isPending) {
    return (
      <DashboardPage>
        <DashboardHeaderSkeleton />
      </DashboardPage>
    );
  }

  if (query.isError) {
    return (
      <DashboardPage>
        <DashboardUnavailableState
          title="Tasks unavailable"
          description="Your teacher task queue could not be loaded."
          onRetry={() => void query.refetch()}
        />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <DashboardHeader
        title="Tasks"
        description="Workflow items that currently need your attention."
        role="Teacher"
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <DashboardSection
        title="Teacher task queue"
        description="Attendance, assessment, and other authorized workflow actions."
      >
        <TaskList tasks={query.data ?? []} />
      </DashboardSection>
    </DashboardPage>
  );
}

export function TeacherAssignmentsView() {
  const query = useTeacherAssignments();

  if (query.isPending) {
    return (
      <DashboardPage>
        <DashboardHeaderSkeleton />
      </DashboardPage>
    );
  }

  if (query.isError) {
    return (
      <DashboardPage>
        <DashboardUnavailableState
          title="Assignments unavailable"
          description="Your teaching assignments could not be loaded."
          onRetry={() => void query.refetch()}
        />
      </DashboardPage>
    );
  }

  const assignments = query.data ?? [];

  return (
    <DashboardPage>
      <DashboardHeader
        title="Teaching assignments"
        description="Classes and learning areas assigned to your teacher account."
        role="Teacher"
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <DashboardSection title="My assignments">
        <TeachingAssignmentList
          active={assignments.filter(item => item.assignment_status !== "upcoming")}
          upcoming={assignments.filter(item => item.assignment_status === "upcoming")}
        />
      </DashboardSection>
    </DashboardPage>
  );
}

function timetableLabel(entry: TeacherTimetableEntry) {
  return entry.learning_area_id
    ? `Learning area ${entry.learning_area_id}`
    : "Scheduled lesson";
}

export function TeacherTimetableView() {
  const query = useTeacherTimetable();

  if (query.isPending) {
    return (
      <DashboardPage>
        <DashboardHeaderSkeleton />
      </DashboardPage>
    );
  }

  if (query.isError) {
    return (
      <DashboardPage>
        <DashboardUnavailableState
          title="Timetable unavailable"
          description="Your timetable could not be loaded."
          onRetry={() => void query.refetch()}
        />
      </DashboardPage>
    );
  }

  const entries = query.data ?? [];

  return (
    <DashboardPage>
      <DashboardHeader
        title="Timetable"
        description="Your authorized teaching schedule."
        role="Teacher"
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <DashboardSection
        title="Teaching timetable"
        description="Scheduled timetable entries assigned to your account."
      >
        {!entries.length ? (
          <DashboardEmptyCalendar message="No timetable entries were returned." />
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 py-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{timetableLabel(entry)}</p>
                    <Badge variant="secondary">
                      Day {entry.day_of_week}
                    </Badge>

                    {entry.substitution_id ? (
                      <Badge variant="outline">Substitution</Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {entry.period_id ? (
                      <span className="flex items-center gap-1">
                        <Clock3 className="size-3.5" />
                        Period {entry.period_id}
                      </span>
                    ) : null}

                    {entry.grade_id ? <span>Grade {entry.grade_id}</span> : null}
                    {entry.stream_id ? <span>Stream {entry.stream_id}</span> : null}
                    {entry.room_id ? <span>Room {entry.room_id}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </DashboardPage>
  );
}
