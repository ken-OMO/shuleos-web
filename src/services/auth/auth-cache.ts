import type { QueryClient } from "@tanstack/react-query";

let activeQueryClient: QueryClient | null = null;

export function registerAuthQueryClient(client: QueryClient | null) {
  activeQueryClient = client;
}

export async function clearAuthenticatedQueryCache() {
  if (!activeQueryClient) return;
  await activeQueryClient.cancelQueries();
  activeQueryClient.clear();
}
