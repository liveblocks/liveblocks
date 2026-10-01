import { defineConfig, devices } from "@playwright/test";

// The suite runs against the local Liveblocks dev server by default:
//
//   npm run test:e2e
//
// That wraps Playwright in `liveblocks dev -c`, which starts a throwaway
// server and injects LIVEBLOCKS_SECRET_KEY / NEXT_PUBLIC_LIVEBLOCKS_BASE_URL
// for the Next.js dev server (env vars win over .env.local).
//
// To run against your real Liveblocks project instead (needed for the AI
// reply flows, which use REST endpoints the dev server only stubs), use
// `npm run test:e2e:cloud` with LIVEBLOCKS_SECRET_KEY in .env.local.
const devServerPort = process.env.LIVEBLOCKS_DEV_SERVER_PORT;
const backend = process.env.E2E_BACKEND ?? (devServerPort ? "local" : "cloud");
const appPort = Number(process.env.E2E_APP_PORT ?? 3111);
const baseURL = `http://localhost:${appPort}`;

if (backend === "local" && !devServerPort) {
  throw new Error(
    "No Liveblocks dev server detected. Run `npm run test:e2e` so one is started for you, or `npm run test:e2e:cloud` to use your .env.local keys."
  );
}

const serverEnv: Record<string, string> = {
  // Never hit a real model from the test suite: the mock reply is deterministic
  AI_GATEWAY_API_KEY: "",
  // Keep clear of a `next dev` you may already have running (see next.config.ts)
  NEXT_DIST_DIR: ".next-e2e",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  metadata: { backend },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${appPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, ...serverEnv, PORT: String(appPort) },
  },
});
