/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { execFileSync, spawnSync } from "node:child_process";

import { parse } from "@bomb.sh/args";

import type { SubCommand } from "./SubCommand.js";

function isBunInstalled(): boolean {
  try {
    execFileSync("bun", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-execute the current command under Bun. This is used when the CLI is
 * invoked via Node (e.g. `npx liveblocks dev`) but the subcommand requires the
 * Bun runtime. If Bun is available on the system, we transparently re-exec
 * under it.
 */
function reExecWithBun(): never {
  if (isBunInstalled()) {
    const result = spawnSync("bun", process.argv.slice(1), {
      stdio: "inherit",
    });
    process.exit(result.status ?? 1);
  } else {
    console.error("The Liveblocks local dev server requires Bun.");
    console.error("See https://liveblocks.io/docs/get-started/dev-server for more information."); // prettier-ignore
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Two-stage argv parsing
// Stage 1: global flags (everything before the subcommand)
// Stage 2: subcommand-specific flags (everything after the subcommand)
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const subIndex = argv.findIndex((a) => !a.startsWith("-"));

const globalArgs = parse(subIndex >= 0 ? argv.slice(0, subIndex) : argv, {
  boolean: ["help", "version"],
  alias: { h: "help", v: "version" },
});

const command = subIndex >= 0 ? argv[subIndex] : undefined;
const commandArgv = subIndex >= 0 ? argv.slice(subIndex + 1) : [];

// ---------------------------------------------------------------------------
// SubCommands
// ---------------------------------------------------------------------------

async function loadCommand(name: string): Promise<SubCommand | undefined> {
  switch (name) {
    case "dev": {
      if (typeof Bun === "undefined") {
        reExecWithBun();
      }
      return (await import("./dev-server/index.js")).default;
    }
    case "upgrade":
      return (await import("./upgrade/index.js")).default;
    default:
      return undefined;
  }
}

const COMMAND_NAMES: Record<string, string> = {
  dev: "Start the local Liveblocks dev server",
  upgrade: "Upgrade all Liveblocks packages",
};

// ---------------------------------------------------------------------------
// Global flag handling
// ---------------------------------------------------------------------------

function showHelp(): void {
  console.log(`liveblocks v${__VERSION__}`);
  console.log();
  console.log("Usage: liveblocks <command> [options]");
  console.log();
  console.log("SubCommands:");
  for (const [name, desc] of Object.entries(COMMAND_NAMES)) {
    console.log(`  ${name.padEnd(12)} ${desc}`);
  }
  console.log();
  console.log("Options:");
  console.log("  -h, --help       Show this help message");
  console.log("  -v, --version    Show version number");
}

async function main(): Promise<void> {
  if (globalArgs.version) {
    console.log(__VERSION__);
    process.exit(0);
  }

  if (globalArgs.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const cmd = await loadCommand(command);
  if (cmd) {
    await cmd.run(commandArgv);
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "liveblocks --help" for usage.');
    process.exit(1);
  }
}

void main();
