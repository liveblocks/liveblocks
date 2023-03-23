import { execSync } from "child_process";

export enum PackageManager {
  NPM = "npm",
  YARN = "yarn",
  PNPM = "pnpm",
}

const managers = Object.values(PackageManager);

// Prioritising `npm` (with fallbacks) because we have `package-lock.json` in our examples
export function getPackageManager(): PackageManager {
  for (const manager of managers) {
    if (
      process.env.npm_config_user_agent &&
      process.env.npm_config_user_agent.startsWith(manager)
    ) {
      return manager;
    }
  }

  try {
    execSync("npm --version", { stdio: "ignore" });
    return PackageManager.NPM;
  } catch {
    try {
      try {
        execSync("yarn --version", { stdio: "ignore" });
        return PackageManager.YARN;
      } catch {
        execSync("pnpm --version", { stdio: "ignore" });
        return PackageManager.PNPM;
      }
    } catch {
      return PackageManager.NPM;
    }
  }
}
