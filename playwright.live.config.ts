import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/live", testMatch: "*.spec.ts", workers: 1,
  timeout: 60_000, expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:3000" },
  webServer: { command: "npm run start -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000/login", reuseExistingServer: false },
});
