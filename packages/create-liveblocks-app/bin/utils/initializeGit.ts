import c from "ansi-colors";
import { loadingSpinner } from "./loadingSpinner";
import { execAsync } from "./execAsync";
import { execSync } from "child_process";
import prompts, { PromptObject } from "prompts";

export async function initializeGit({ appDir }: { appDir: string }) {
  let spinner;

  try {
    // Check git installed
    await execAsync("git --version", {
      cwd: appDir,
      encoding: "utf-8",
    });

    const continueInit = await checkIfInsideRepo(appDir);
    if (!continueInit) {
      return;
    }

    spinner = loadingSpinner().start("Initializing git...");

    const options = {
      cwd: appDir,
      stdio: "pipe",
    } as const;

    await execAsync("git init", options);
    await execAsync("git checkout -b main", options);
    spinner.text = "Git: Adding files...";
    await execAsync("git add -A", options);
    spinner.text = "Git: Making first commit...";
    await execAsync(
      'git commit -m "Initial commit from create-liveblocks-app"',
      options
    );
  } catch (err) {
    spinner?.fail(c.redBright.bold("Problem initializing git:"));
    console.log();
    console.log(err);
    console.log();
    process.exit(0);
  }

  spinner?.succeed(c.green("Git initialized!"));
}

type Question = {
  confirmNestedRepo: boolean;
};

async function checkIfInsideRepo(appDir: string): Promise<boolean> {
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

    // Remove git error message
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
  }

  if (insideRepo) {
    const question: PromptObject<keyof Question> = {
      name: "confirmNestedRepo",
      type: "confirm",
      message: `Directory is already inside a git repository, continue anyway?`,
      initial: true,
      active: "yes",
      inactive: "no",
    };

    const { confirmNestedRepo = true }: Question = await prompts([question]);
    return confirmNestedRepo;
  }

  return true;
}
