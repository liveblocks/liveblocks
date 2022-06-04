import { execSync } from "child_process";

const managers = ["yarn", "pnpm", "npm"];

export default function getPackageManager () {
  for (const manager of managers) {
    if (process.env.npm_execpath && process.env.npm_execpath.includes(manager)) {
      return manager;
    }

    if (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes(manager)) {
      return manager;
    }
  }

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
