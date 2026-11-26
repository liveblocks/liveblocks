import { defineConfig, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";

// Each worktree gets its own Next port, so two e2e runs can happen at once.
// The Liveblocks dev server picks its own random port inside dev-local.
function freePort(): number {
  const script =
    "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})";
  return Number(execFileSync(process.execPath, ["-e", script]).toString());
}

if (!process.env.PORT) {
  process.env.PORT = String(freePort());
}
const port = Number(process.env.PORT);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testMatch: ["**/tests/*.spec.ts"],
  testIgnore: ["node_modules/**", ".next/**"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // LIVEBLOCKS_CLOUD=1 runs against the real backend using .env.local keys,
    // which unlocks the cloud-only specs (Feeds, Comments).
    command: process.env.LIVEBLOCKS_CLOUD
      ? `npx next dev --port ${port}`
      : "node scripts/dev-local.mjs --mock-ai",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(port), NEXT_DIST_DIR: ".next-e2e" },
  },
});
