import { defineConfig, devices } from "@playwright/test";

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
  AI_GATEWAY_API_KEY: "",
  NEXT_DIST_DIR: ".next-e2e",
};

export default defineConfig({
  testDir: ".",
  testMatch: "{features,views}/**/tests/*.spec.ts",
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
