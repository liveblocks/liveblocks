#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: npm run dev:local [-- --mock-ai]

Starts a throwaway local Liveblocks dev server (random port, no persistence)
and \`next dev\` pointed at it. No keys are needed: the dev server injects
LIVEBLOCKS_SECRET_KEY, LIVEBLOCKS_BASE_URL and NEXT_PUBLIC_LIVEBLOCKS_BASE_URL.

  PORT=<n>     port for Next (default: a free port)
  --mock-ai    force the mock AI reply even if AI_GATEWAY_API_KEY is set
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const unknown = args.filter((arg) => arg !== "--mock-ai");
if (unknown.length > 0) {
  console.error(`dev-local: unknown argument ${unknown.join(" ")}\n`);
  console.error(USAGE);
  process.exit(1);
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

const port = process.env.PORT ? Number(process.env.PORT) : await freePort();
if (!Number.isInteger(port) || port <= 0) {
  console.error(
    `dev-local: PORT must be a positive integer, got ${process.env.PORT}`
  );
  process.exit(1);
}

const env = { ...process.env, PORT: String(port) };
if (args.includes("--mock-ai")) {
  env.AI_GATEWAY_API_KEY = "";
}

console.log(
  `dev-local: Next on http://localhost:${port} (Liveblocks dev server on a random port)`
);

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "liveblocks",
    "dev",
    "--random-port",
    "--no-check",
    "--no-persist",
    "--cmd",
    `npx next dev --port ${port}`,
  ],
  { cwd: projectRoot, env, stdio: "inherit" }
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
