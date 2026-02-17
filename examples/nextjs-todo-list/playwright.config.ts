import { defineConfig } from "@playwright/test";

const NEXT_PORT = 3009;
const LIVEBLOCKS_PORT = 1153;

export default defineConfig({
  testDir: "./test",
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${NEXT_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    // Locally, start the liveblocks dev server via npx.
    // In CI it runs as a Docker service container instead
    // (see .github/workflows/e2e-todo-list.yml), or you can keep this
    // entry and let Playwright start `npx liveblocks dev` in CI too.
    ...(process.env.CI
      ? []
      : [
          {
            command: `npx liveblocks dev --port ${LIVEBLOCKS_PORT}`,
            port: LIVEBLOCKS_PORT,
            reuseExistingServer: true,
          },
        ]),
    {
      command: process.env.CI
        ? `npx next start --port ${NEXT_PORT}`
        : `npx next dev --port ${NEXT_PORT}`,
      port: NEXT_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY: "pk_localdev",
        NEXT_PUBLIC_LIVEBLOCKS_BASE_URL: `http://localhost:${LIVEBLOCKS_PORT}`,
      },
    },
  ],
});
