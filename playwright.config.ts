import { defineConfig, devices } from "@playwright/test";

const chrome = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", launchOptions: { executablePath: chrome }, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: chrome } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath: chrome } } },
  ],
  webServer: { command: "npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 60_000 },
});
