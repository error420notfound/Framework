import { defineConfig, devices } from "@playwright/test";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.FORMWORK_CHROMIUM_PATH
          ? {
              launchOptions: {
                executablePath: process.env.FORMWORK_CHROMIUM_PATH,
              },
            }
          : {}),
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  workers: 3,
  webServer: [
    {
      command: `${npm} run dev -- --port 5173`,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `node scripts/serve-fixture.mjs`,
      url: "http://127.0.0.1:4322",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
