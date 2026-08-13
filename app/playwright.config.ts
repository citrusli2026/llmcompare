import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 60 * 1000, // dev server 首次编译可能较慢, 放宽默认 30s
  expect: {
    timeout: 10 * 1000,
  },
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "npx next dev --port 3003",
    url: "http://localhost:3003",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
