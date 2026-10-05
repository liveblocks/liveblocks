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

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { beforeAll, describe, expect, test } from "bun:test";

const CLI = resolve(import.meta.dir, "../../dist/index.js");
const CWD = resolve(import.meta.dir, "../..");

/**
 * Runs the equivalent of `npx liveblocks <subArgs>` (but on the local build
 * instead of the latest NPM version) and capture combined stdout+stderr
 * output. Returns { stdout, stderr, exitCode }.
 */
async function runCli(
  subArgs: string[],
  options?: { env?: Record<string, string>; cwd?: string }
) {
  const proc = Bun.spawn(["bun", CLI, ...subArgs], {
    cwd: options?.cwd ?? CWD,
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
  options?: { env?: Record<string, string>; cwd?: string }
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

  test("respects LIVEBLOCKS_DEVSERVER_HOST env var", async () => {
    const { stdout, exitCode } = await runDevCommand(
      ["-c", "env | grep LIVEBLOCKS_DEV_SERVER"],
      { env: { LIVEBLOCKS_DEVSERVER_HOST: "0.0.0.0" } }
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("LIVEBLOCKS_DEV_SERVER_HOST=0.0.0.0");
  });

  test("--host flag takes precedence over LIVEBLOCKS_DEVSERVER_HOST env var", async () => {
    const { stdout, exitCode } = await runDevCommand(
      ["--host", "127.0.0.1", "-c", "env | grep LIVEBLOCKS_DEV_SERVER"],
      { env: { LIVEBLOCKS_DEVSERVER_HOST: "0.0.0.0" } }
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("LIVEBLOCKS_DEV_SERVER_HOST=127.0.0.1");
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

  test("--random-port (-P) injects a random free port instead of the default", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-P",
      "-c",
      "env | grep LIVEBLOCKS_DEV_SERVER_PORT",
    ]);
    expect(exitCode).toBe(0);

    const match = stdout.match(/LIVEBLOCKS_DEV_SERVER_PORT=(\d+)/);
    const port = match ? Number(match[1]) : undefined;
    expect(port).toBeGreaterThan(0);
    // A free port was picked by the OS, not the static default.
    expect(port).not.toBe(1153);
  });

  test("injects connection details so apps need no config changes", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-p",
      "7780",
      "-c",
      "env | grep LIVEBLOCKS",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("LIVEBLOCKS_BASE_URL=http://localhost:7780");
    expect(stdout).toContain("LIVEBLOCKS_PUBLIC_KEY=pk_localdev");
    expect(stdout).toContain("LIVEBLOCKS_SECRET_KEY=sk_localdev");
    expect(stdout).toContain(
      "NEXT_PUBLIC_LIVEBLOCKS_BASE_URL=http://localhost:7780"
    );
    expect(stdout).toContain("NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_localdev");
    expect(stdout).toContain("VITE_LIVEBLOCKS_BASE_URL=http://localhost:7780");
    expect(stdout).toContain("VITE_LIVEBLOCKS_PUBLIC_KEY=pk_localdev");
    expect(stdout).toContain(
      "PUBLIC_LIVEBLOCKS_BASE_URL=http://localhost:7780"
    );
    expect(stdout).toContain("PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_localdev");
  });

  test("never publishes a secret key under a client-visible prefix", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-p",
      "7781",
      "-c",
      "env | grep LIVEBLOCKS",
    ]);
    expect(exitCode).toBe(0);

    // Bundlers ship any variable carrying their own prefix to the browser, so
    // a secret must never be injected under one. `VITE_` is Vite's equivalent
    // of `NEXT_PUBLIC_`, not of `NEXT_`.
    const published = stdout
      .split("\n")
      .map((line) => line.split("=")[0])
      .filter((name) => /^(NEXT_PUBLIC_|VITE_|PUBLIC_)/.test(name));
    expect(published).not.toContainEqual(expect.stringContaining("SECRET"));
  });

  test("overrides cloud credentials inherited from the parent environment", async () => {
    const { stdout, exitCode } = await runDevCommand(
      ["-p", "7782", "-c", "env | grep LIVEBLOCKS"],
      {
        env: {
          LIVEBLOCKS_SECRET_KEY: "sk_prod_realkey",
          NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY: "pk_prod_realkey",
        },
      }
    );
    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("sk_prod_realkey");
    expect(stdout).not.toContain("pk_prod_realkey");
    expect(stdout).toContain("LIVEBLOCKS_SECRET_KEY=sk_localdev");
    expect(stdout).toContain("NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_localdev");
  });

  test("injected base URL follows --random-port", async () => {
    const { stdout, exitCode } = await runDevCommand([
      "-P",
      "-c",
      "env | grep LIVEBLOCKS",
    ]);
    expect(exitCode).toBe(0);

    const port = stdout.match(/LIVEBLOCKS_DEV_SERVER_PORT=(\d+)/)?.[1];
    expect(port).toBeDefined();
    expect(stdout).toContain(`LIVEBLOCKS_BASE_URL=http://localhost:${port}`);
    expect(stdout).toContain(
      `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL=http://localhost:${port}`
    );
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

describe("storage mode", () => {
  test("--cmd is ephemeral by default, leaving .liveblocks/ alone", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "lb-cwd-"));
    try {
      const { stderr, exitCode } = await runDevCommand(
        ["-P", "-v", "-c", "true"],
        { cwd }
      );
      expect(exitCode).toBe(0);
      expect(stderr).toContain("ephemeral storage");
      expect(existsSync(join(cwd, ".liveblocks"))).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("--persist keeps data under .liveblocks/", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "lb-cwd-"));
    try {
      const { stderr, exitCode } = await runDevCommand(
        ["-P", "-v", "--persist", "-c", "true"],
        { cwd }
      );
      expect(exitCode).toBe(0);
      expect(stderr).toContain("persistent storage");
      expect(existsSync(join(cwd, ".liveblocks"))).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("--persist and --no-persist together is an error", async () => {
    const { stderr, exitCode } = await runDevCommand([
      "-P",
      "--persist",
      "--no-persist",
      "-c",
      "true",
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("mutually exclusive");
  });
});
