import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    video: "on",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // `next build`/`next start` always run in production mode, where
    // Next's own env-file precedence puts .env.production.local ahead of
    // .env.local — so a plain `npm run build && npm run start` here would
    // silently connect the app under test to real production whenever
    // .env.production.local exists locally. build:local/start:local inject
    // .env.local into process.env first (scripts/with-env.mjs), which wins
    // over every env *file* regardless of mode, keeping e2e pointed at the
    // local Docker services.
    command: "npm run build:local && npm run start:local",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
