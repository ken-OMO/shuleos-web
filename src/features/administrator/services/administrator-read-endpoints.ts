export type AdministratorReadScope = "school" | "platform";

export function administratorReadEndpoint(scope: AdministratorReadScope, resource: "tasks" | "alerts"): string {
  return scope === "platform" ? `/admin/platform/${resource}` : `/admin/${resource}`;
}
