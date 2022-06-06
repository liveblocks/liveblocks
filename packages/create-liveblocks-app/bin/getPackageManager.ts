import { execSync } from "child_process";

const managers = ["npm", "yarn", "pnpm"];

// Prioritising `npm` (with fallbacks) because we have `package-lock.json` in our examples
export default function getPackageManager() {
  for (const manager of managers) {
    if (process.env.npm_config_user_agent && process.env.npm_config_user_agent.startsWith(manager)) {
      return manager;
    }
  }

  try {
    execSync("npm --version", { stdio: "ignore" });
    return "npm";
  } catch {
    try {
      try {
        execSync("yarn --version", { stdio: "ignore" });
        return "yarn";
      } catch {
        execSync("pnpm --version", { stdio: "ignore" });
        return "pnpm";
      }
    } catch {
      return "npm";
    }
  }
}
