"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardSection } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/services/api/api-client";

type Coverage = {
  id: string; grade: string; stream: string; year: string; term: string; upcoming: boolean;
  areas: { id: string; name: string; lessons_per_week: number; teachers: string[] }[];
};

export function TeachingCoverage({ ownClass = false }: { ownClass?: boolean }) {
  const allowed = useAuthStore(state => state.status === "authenticated" && state.user?.scope === "school" &&
    (ownClass ? state.hasRole("Teacher") && state.hasPermission("access_teacher_portal") :
      (state.hasRole("School Admin") && state.hasPermission("access_administrator_portal")) ||
      (state.hasRole("Headteacher") && state.hasPermission("manage_academics"))));
  const [selected, setSelected] = useState("");
  const query = useQuery({
    queryKey: useScopedQueryKey(["teaching-coverage", ownClass]),
    enabled: allowed,
    queryFn: async ({ signal }): Promise<Coverage[]> => {
      const { data } = await apiClient.get(ownClass ? "/teacher/class-teacher/learning-areas" : "/teacher-assignments/coverage", { signal });
      if (data.success !== true || !Array.isArray(data.data)) throw new Error("Teaching coverage unavailable.");
      return data.data;
    },
  });
  const classes = query.data ?? [];
  const current = classes.find(item => item.id === selected) ?? classes[0];

  if (!allowed || (ownClass && query.isSuccess && !classes.length)) return null;
  return <DashboardSection title={ownClass ? "Learning areas in my class" : "Learning areas and teachers by class"}>
    {query.isPending ? <p role="status">Loading teaching coverage…</p> :
      query.isError ? <p role="alert">Teaching coverage could not be loaded. <Button onClick={() => void query.refetch()}>Retry</Button></p> :
      current ? <div className="space-y-4">
        <label className="grid max-w-lg gap-1">Grade, stream and term
          <select className="rounded-md border bg-background p-2" value={current.id} onChange={event => setSelected(event.target.value)}>
            {classes.map(item => <option key={item.id} value={item.id}>
              {item.grade} / {item.stream} · {item.year} · {item.term}{item.upcoming ? " (Upcoming)" : ""}
            </option>)}
          </select>
        </label>
        {current.areas.length ? <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Learning area</th><th className="p-2">Lessons per week</th><th className="p-2">Assigned teachers</th></tr></thead>
            <tbody>{current.areas.map(area => <tr key={area.id} className="border-b">
              <th scope="row" className="p-2 font-medium">{area.name}</th>
              <td className="p-2">{area.lessons_per_week}</td>
              <td className="p-2">{area.teachers.join(", ") || "Unassigned"}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p>No learning areas allocated to this grade yet.</p>}
      </div> : <p>No classes are available for the current or upcoming terms.</p>}
  </DashboardSection>;
}
