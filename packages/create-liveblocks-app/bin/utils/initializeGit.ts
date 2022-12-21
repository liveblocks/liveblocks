import c from "ansi-colors";
import { loadingSpinner } from "./loadingSpinner";
import { execAsync } from "./execAsync";
import { execSync } from "child_process";

export async function initializeGit({ appDir }: { appDir: string }) {
  const spinner = loadingSpinner().start("Initializing git...");

  const options = {
    cwd: appDir,
    stdio: "pipe",
  } as const;

  try {
    // Check git installed
    await execAsync("git --version", {
      cwd: appDir,
      encoding: "utf-8",
    });

    // Check if inside a repo
    let insideRepo;
    try {
      const result = execSync("git rev-parse --is-inside-work-tree", {
        cwd: appDir,
        encoding: "utf-8",
      });
      insideRepo = result === "true";
    } catch (err) {
      // Error means not inside a repo
      insideRepo = false;
    }

    // Skip rest of function if already inside a repo
    if (insideRepo) {
      return;
    }

    await execAsync("git init", options);
    await execAsync("git checkout -b main", options);
    spinner.text = "Adding files...";
    await execAsync("git add -A", options);
    spinner.text = "Making first commit...";
    await execAsync(
      'git commit -m "Initial commit from create-liveblocks-app"',
      options
    );
  } catch (err) {
    spinner.fail(c.redBright.bold("Problem initializing git:"));
    console.log();
    console.log(err);
    console.log();
    process.exit(0);
  }

  spinner.succeed(c.green("Git initialized!"));
}
