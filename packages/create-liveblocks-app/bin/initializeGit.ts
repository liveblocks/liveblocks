import c from "ansi-colors";
import { loadingSpinner } from "./loadingSpinner.js";
import { execAsync } from "./execAsync.js";
import { execSync } from "child_process";

export async function initializeGit({ appDir }: { appDir: string }) {
  const spinner = loadingSpinner().start("Initializing git...");

  const options = {
    cwd: appDir,
    stdio: "pipe",
  } as const;

  try {
    const insideRepo = execSync("git rev-parse --is-inside-work-tree", {
      cwd: appDir,
      encoding: "utf-8",
    });

    if (insideRepo === "true") {
      return;
    }

    await execAsync("git init", options);
    await execAsync("git checkout -b main", options);
    await execAsync("git add -A", options);
    await execAsync('git commit -m "Initial commit from create-liveblocks-app', options);
  } catch (err) {
    spinner.fail(c.redBright.bold("Problem initializing git"));
    console.log(err);
    return;
  }

  spinner.succeed(c.green("Git initialized!"));
}
