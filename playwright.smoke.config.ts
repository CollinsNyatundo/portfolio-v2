import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the deployed site (tasks 6.3, 6.7). No local server:
 * SMOKE_URL picks the target, the production domain by default.
 */
export default defineConfig({
  testDir: "tests/smoke",
  retries: 1,
  reporter: process.env.CI ? [["github"]] : "list",
  use: {
    baseURL: process.env.SMOKE_URL ?? "https://collinsnyagaka.com",
    // Requests identify themselves as this repository's monitor.
    userAgent:
      "collinsnyagaka-smoke/1.0 (+https://github.com/CollinsNyatundo/portfolio-v2)",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
