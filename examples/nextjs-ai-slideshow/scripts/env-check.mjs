#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: npm run env:check

Lists the environment variables this app reads, whether each is set (from the
shell or .env.local), and what it unlocks. Nothing is required for
\`npm run dev:local\`, \`npm run check\` or \`npm run e2e\`.
`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error(`env-check: unexpected arguments\n`);
  console.error(USAGE);
  process.exit(1);
}

const VARIABLES = [
  {
    name: "LIVEBLOCKS_SECRET_KEY",
    required: "for `npm run dev`",
    unlocks:
      "auth, comments, feeds and server-side slide updates against Liveblocks Cloud (or the local dev server when it injects sk_localdev)",
  },
  {
    name: "AI_GATEWAY_API_KEY",
    required: "optional",
    unlocks:
      "real assistant replies through the Vercel AI Gateway; unset, the chat streams a mock reply with one sample proposal",
  },
  {
    name: "LIVEBLOCKS_BASE_URL",
    required: "optional",
    unlocks:
      "server-side Liveblocks API base URL; injected by `dev:local`, leave unset for Liveblocks Cloud",
  },
  {
    name: "NEXT_PUBLIC_LIVEBLOCKS_BASE_URL",
    required: "optional",
    unlocks:
      "client-side Liveblocks base URL; injected by `dev:local`, leave unset for Liveblocks Cloud",
  },
  {
    name: "LIVEBLOCKS_CLOUD",
    required: "optional",
    unlocks:
      "`npm run e2e` runs against `.env.local` keys and includes the cloud-only specs (AI chat reply, comments)",
  },
];

function readDotEnvLocal() {
  const file = join(projectRoot, ".env.local");
  if (!existsSync(file)) {
    return {};
  }
  const values = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) {
      values[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return values;
}

const dotEnv = readDotEnvLocal();
let missingRequired = false;
console.log(
  `env-check (${existsSync(join(projectRoot, ".env.local")) ? ".env.local found" : "no .env.local"})\n`
);
for (const variable of VARIABLES) {
  const fromShell = process.env[variable.name];
  const fromFile = dotEnv[variable.name];
  const value = fromShell || fromFile;
  const source = fromShell ? "shell" : fromFile ? ".env.local" : null;
  const status = value ? `set (${source})` : "missing";
  if (!value && variable.required !== "optional") {
    missingRequired = true;
  }
  console.log(`${variable.name}: ${status}`);
  console.log(`  ${variable.required}; unlocks ${variable.unlocks}`);
}
console.log(
  missingRequired
    ? "\n`npm run dev` needs the missing required variable(s). `npm run dev:local` needs none."
    : "\nAll required variables are set."
);
