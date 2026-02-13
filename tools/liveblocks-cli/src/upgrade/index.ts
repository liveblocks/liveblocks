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

import { parse } from "@bomb.sh/args";
import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import type { SubCommand } from "../SubCommand.js";

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

const upgrade: SubCommand = {
  description: "Upgrade all Liveblocks packages",

  run(_argv) {
    const args = parse(_argv, {
      boolean: ["help"],
      alias: { h: "help" },
    });

    if (args.help) {
      console.log("Usage: liveblocks upgrade [version]");
      console.log();
      console.log(
        "Upgrade all @liveblocks/* packages in your project to the same version."
      );
      console.log();
      console.log("Arguments:");
      console.log('  version      Target version or tag (default: "latest")');
      console.log();
      console.log("Options:");
      console.log("  -h, --help   Show this help message");
      return;
    }

    const version = String(args._[0] ?? "latest");

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

    console.log();
    console.log(`Upgrading all @liveblocks/* packages to ${version}...`);
    console.log();

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
