import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: ["**/assistant-enabled.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Tests run against the production build (`npm run build` first).
    // Pin ASSISTANT_MODE=off so local .env.local does not enable the v2 drawer
    // during the default disabled-mode E2E suite.
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: Object.fromEntries(
      Object.entries({ ...process.env, ASSISTANT_MODE: "off" }).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  },
});
