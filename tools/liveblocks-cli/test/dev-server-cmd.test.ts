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

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { beforeAll, describe, expect, test } from "bun:test";

const CLI = resolve(import.meta.dir, "../dist/index.js");
const CWD = resolve(import.meta.dir, "..");

/**
 * Runs the equivalent of `npx liveblocks <subArgs>` (but on the local build
 * instead of the latest NPM version) and capture combined stdout+stderr
 * output. Returns { stdout, stderr, exitCode }.
 */
async function runCli(
  subArgs: string[],
  options?: { env?: Record<string, string> }
) {
  const proc = Bun.spawn(["bun", CLI, ...subArgs], {
    cwd: CWD,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...options?.env },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

async function runDevCommand(
  args: string[],
  options?: { env?: Record<string, string> }
) {
  return runCli(["dev", ...args], options);
}

beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error(
      "CLI not built. Run `npx turbo run build --filter=liveblocks` first."
    );
  }
});

describe("unrecognized flags", () => {
  test("liveblocks --foo errors", async () => {
    const { stderr, exitCode } = await runCli(["--foo"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--foo");
  });

  test("liveblocks dev --foo errors", async () => {
    const { stderr, exitCode } = await runDevCommand(["--foo"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--foo");
  });

  test("liveblocks upgrade --foo errors", async () => {
    const { stderr, exitCode } = await runCli(["upgrade", "--foo"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--foo");
  });
});

describe("liveblocks dev -c", () => {
  test("passes through parent environment variables", async () => {
    const { stdout, exitCode } = await runDevCommand(["-c", "env | grep FOO"], {
      env: { FOO: "bar" },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("FOO=bar");
  });

  test("injects LIVEBLOCKS_DEV_SERVER_HOST and _PORT with defaults", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-c",
      "env | grep LIVEBLOCKS_DEV_SERVER",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("LIVEBLOCKS_DEV_SERVER_HOST=localhost");
    expect(stdout).toContain("LIVEBLOCKS_DEV_SERVER_PORT=1153");
  });

  test("injects custom port via -p flag", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-p",
      "7777",
      "-c",
      "env | grep LIVEBLOCKS_DEV_SERVER",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("LIVEBLOCKS_DEV_SERVER_PORT=7777");
  });

  test("does not change cwd of child process", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-p",
      "7778",
      "-c",
      "pwd && (cd /tmp && pwd) && pwd",
    ]);
    expect(exitCode).toBe(0);
    const lines = stdout.trim().split("\n");
    expect(lines).toHaveLength(3);
    // First and last pwd should be the same (CWD), middle should be /tmp
    expect(lines[0]).toBe(lines[2]);
    expect(lines[1]).toBe("/tmp");
  });

  test("child cd does not affect parent cwd", async () => {
    const cwdBefore = process.cwd();
    const { stdout, exitCode } = await runDevCommand([
      "-p",
      "7779",
      "-c",
      "cd /tmp && pwd",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("/tmp");
    // Parent process cwd should be unchanged
    expect(process.cwd()).toBe(cwdBefore);
  });

  test("propagates child exit code", async () => {
    const { exitCode } = await runDevCommand(["-c", "exit 42"]);
    expect(exitCode).toBe(42);
  });
});
