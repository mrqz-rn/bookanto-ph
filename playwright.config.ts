import { defineConfig, devices } from "@playwright/test";

// Runs against PLAYWRIGHT_BASE_URL (a preview deploy in CI) or a dev server
// on its own port, so it never reuses some other app on 3000.
const port = Number(process.env.E2E_PORT ?? 3210);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    // A 360px-wide budget Android phone, the main design target.
    { name: "android", use: { ...devices["Moto G4"] } },
    { name: "iphone", use: { ...devices["iPhone 15"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: `pnpm dev --port ${port}`, url: baseURL, reuseExistingServer: !process.env.CI },
});
