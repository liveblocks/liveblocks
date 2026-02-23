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

import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import type { SubCommand } from "~/interfaces/SubCommand";
import { parseArgs } from "~/lib/args";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function findLiveblocksDependencies(
  dependencies?: Record<string, string>
): string[] {
  return Object.keys(dependencies ?? {}).filter((dep) =>
    dep.startsWith("@liveblocks/")
  );
}

export function cmpSemver(a: string, b: string): number {
  const [coreA, preA] = a.split("-", 2);
  const [coreB, preB] = b.split("-", 2);
  const partsA = coreA.split(".").map(Number);
  const partsB = coreB.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
  }
  // No prerelease > any prerelease (3.14.0 > 3.14.0-rc1)
  if (!preA && preB) return 1;
  if (preA && !preB) return -1;
  if (preA && preB) return preA < preB ? -1 : preA > preB ? 1 : 0;
  return 0;
}

/**
 * Given the parsed JSON output of `npm view ... version --json`, returns the
 * highest version. npm returns a single string when one version matches, or
 * an array when multiple match.
 */
export function highestVersion(result: string | string[]): string {
  if (typeof result === "string") return result;
  if (Array.isArray(result) && result.length > 0) {
    return result.reduce((a, b) => (cmpSemver(a, b) >= 0 ? a : b));
  }
  throw new Error("No versions found");
}

/**
 * Resolves a version string (tag, partial version, or full semver) to
 * a concrete semver version by querying the npm registry.
 *
 * Examples:
 *   "latest"  → "3.14.0"
 *   "rc"      → "3.14.0-rc2"
 *   "3.14"    → "3.14.0"
 *   "3.14.0"  → "3.14.0"
 *   "<3.14"   → "3.13.5"
 *
 * This ensures `npm install foo@<version>` always receives a full semver
 * version, so npm writes "^x.y.z" in package.json.
 */
function resolveVersion(spec: string): string {
  try {
    const output = execFileSync(
      "npm",
      ["view", `@liveblocks/core@${spec}`, "version", "--json"],
      { encoding: "utf-8" }
    ).trim();
    return highestVersion(JSON.parse(output) as string | string[]);
  } catch {
    console.error(`Could not resolve version "${spec}" from npm registry.`);
    process.exit(1);
  }
}

function detectPackageManager(): "yarn" | "pnpm" | "bun" | "npm" {
  const cwd = process.cwd();
  if (existsSync(resolve(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (
    existsSync(resolve(cwd, "bun.lockb")) ||
    existsSync(resolve(cwd, "bun.lock"))
  )
    return "bun";
  return "npm";
}

type Options = {
  help: boolean;
};

const upgrade: SubCommand = {
  description: "Upgrade all Liveblocks packages",

  run(argv) {
    const { options, args } = parseArgs<Options>(
      argv,
      { help: { type: "boolean", short: "h", default: false } },
      { allowPositionals: true }
    );

    if (options.help) {
      console.log("Usage: liveblocks upgrade [version]");
      console.log();
      console.log("Upgrade all @liveblocks/* packages in your project to the same version."); // prettier-ignore
      console.log();
      console.log("Arguments:");
      console.log('  version      Target version or tag (default: "latest")');
      console.log();
      console.log("Options:");
      console.log("  --help, -h   Show this help message");
      return;
    }

    const version = resolveVersion(String(args[0] ?? "latest"));

    // Read package.json
    const pkgPath = resolve(process.cwd(), "package.json");
    let pkg: PackageJson;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
    } catch {
      console.error("No package.json found in the current directory.");
      process.exit(1);
    }

    // Collect all @liveblocks/* dependencies
    const liveblocksDeps = Array.from(
      new Set([
        ...findLiveblocksDependencies(pkg.dependencies),
        ...findLiveblocksDependencies(pkg.devDependencies),
        ...findLiveblocksDependencies(pkg.peerDependencies),
      ])
    );

    if (liveblocksDeps.length === 0) {
      console.error("No @liveblocks/* packages found in package.json.");
      process.exit(1);
    }

    // Handle package renames
    const depsToUpgrade = liveblocksDeps.map((d) =>
      d === "@liveblocks/react-comments" ? "@liveblocks/react-ui" : d
    );

    const depsToUninstall = liveblocksDeps.filter(
      (d) => d === "@liveblocks/react-comments"
    );

    // Detect package manager
    const pm = detectPackageManager();
    let installCmd: string;
    let uninstallCmd: string;

    switch (pm) {
      case "yarn":
      case "bun":
      case "pnpm":
        installCmd = "add";
        uninstallCmd = "remove";
        break;
      case "npm":
      default:
        installCmd = "install";
        uninstallCmd = "uninstall";
        break;
    }

    console.log(`Upgrading all your Liveblocks dependencies to ${version}`);

    // Uninstall renamed packages first
    if (depsToUninstall.length > 0) {
      execFileSync(pm, [uninstallCmd, ...depsToUninstall], {
        stdio: "inherit",
      });
    }

    // Install/upgrade packages
    if (depsToUpgrade.length > 0) {
      execFileSync(
        pm,
        [installCmd, ...depsToUpgrade.map((dep) => `${dep}@${version}`)],
        { stdio: "inherit" }
      );
    }

    // Warn about @liveblocks/core usage
    if (liveblocksDeps.includes("@liveblocks/core")) {
      console.log();
      console.warn(
        "Warning: @liveblocks/core contains private APIs only. It is recommended to only rely on @liveblocks/client."
      );
      console.log();
    }
  },
};

export default upgrade;
