import assert from "node:assert/strict";
import test from "node:test";
import { AxiosError } from "axios";
import { apiClient } from "../../src/services/api/api-client";
import { administratorDashboardService } from "../../src/features/administrator/services/administrator-dashboard-service";

test("administrator widget requests select platform or school endpoints and preserve cancellation", async () => {
  const adapter = apiClient.defaults.adapter;
  const calls: string[] = [];
  const signal = new AbortController().signal;
  try {
    apiClient.defaults.adapter = async config => {
      calls.push(config.url!);
      assert.equal(config.signal, signal);
      assert.equal(config.params?.school_id, undefined);
      assert.equal(config.headers.get("X-School-Id"), undefined);
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: [{ title: config.url }] } };
    };
    for (const scope of ["school", "platform", "school"] as const) {
      for (const kind of ["tasks", "alerts"] as const) {
        const rows = await administratorDashboardService[kind](signal, scope);
        assert.equal(rows[0].title, scope === "platform" ? `/admin/platform/${kind}` : `/admin/${kind}`);
      }
    }
    await administratorDashboardService.tasks(signal);
    await administratorDashboardService.alerts(signal);
    assert.deepEqual(calls, ["/admin/tasks", "/admin/alerts", "/admin/platform/tasks", "/admin/platform/alerts", "/admin/tasks", "/admin/alerts", "/admin/tasks", "/admin/alerts"]);
  } finally {
    apiClient.defaults.adapter = adapter;
  }
});

test("denied platform widget reads do not retry through a school endpoint", async () => {
  const adapter = apiClient.defaults.adapter;
  const calls: string[] = [];
  try {
    apiClient.defaults.adapter = async config => {
      calls.push(config.url!);
      throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: {}, data: { message: "Forbidden" } });
    };
    await assert.rejects(administratorDashboardService.tasks(undefined, "platform"));
    await assert.rejects(administratorDashboardService.alerts(undefined, "platform"));
    assert.deepEqual(calls, ["/admin/platform/tasks", "/admin/platform/alerts"]);
  } finally {
    apiClient.defaults.adapter = adapter;
  }
});
