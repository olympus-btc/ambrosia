import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command:
        "cd ../server && ./gradlew run --no-daemon " +
        "'--args=--phoenixd-url=http://localhost:9740 " +
        "--phoenixd-password=test-password " +
        "--phoenixd-webhook-secret=test-webhook-secret " +
        "--jwt-access-token-expiration 300'",
      port: 9154,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      port: 3000,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
