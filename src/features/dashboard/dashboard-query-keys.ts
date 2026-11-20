export const dashboardQueryKeys = {
  administrator: {
    dashboard: (scope: "school" | "platform") =>
      ["dashboard", "administrator", scope] as const,
    tasks: ["dashboard", "administrator", "tasks"] as const,
    alerts: ["dashboard", "administrator", "alerts"] as const,
    preferences: ["dashboard", "administrator", "preferences"] as const,
  },
  leadership: (view: string) => ["dashboard", "leadership", view] as const,
  teacher: {
    dashboard: ["dashboard", "teacher"] as const,
    tasks: ["dashboard", "teacher", "tasks"] as const,
    assignments: ["workspace", "teacher", "assignments"] as const,
    timetable: ["workspace", "teacher", "timetable"] as const,
    todaysTimetable: ["workspace", "teacher", "timetable", "today"] as const,
  },
  parent: (learnerId?: string) =>
    ["dashboard", "parent", learnerId ?? "default"] as const,
  learner: ["dashboard", "learner"] as const,
};
