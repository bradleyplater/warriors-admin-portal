import { defineConfig, devices } from "@playwright/test";

// These specs write deliberately invalid legacy Player documents (missing
// `active`, out-of-range shirt numbers) straight into the shared database
// to exercise the migration-review screens. While one exists, every page
// that validates the full player list (/players, /games/new, roster
// pages) returns a 500 — so any spec running alongside them on another
// worker fails at random. They run in their own project, after all other
// specs have finished, one at a time.
const LEGACY_FIXTURE_SPECS = [
  "**/migration-review-active.spec.ts",
  "**/migration-review-number.spec.ts",
  "**/roster-list.spec.ts",
];

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
      testIgnore: LEGACY_FIXTURE_SPECS,
    },
    {
      name: "chromium-legacy-fixtures",
      use: { ...devices["Desktop Chrome"] },
      testMatch: LEGACY_FIXTURE_SPECS,
      dependencies: ["chromium"],
      workers: 1,
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
