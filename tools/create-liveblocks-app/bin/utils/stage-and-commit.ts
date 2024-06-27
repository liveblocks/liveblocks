import c from "ansi-colors";
import { loadingSpinner } from "./loading-spinner";
import { execAsync } from "./exec-async";
import { checkIfInsideRepo } from "./check-inside-repo";

export async function stageAndCommit({ appDir }: { appDir: string }) {
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

    const options = {
      cwd: appDir,
      stdio: "pipe",
    } as const;

    spinner = loadingSpinner().start("Git: Adding files…");
    await execAsync("git add -A", options);
    spinner.text = "Git: Making first commit…";
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

  spinner?.succeed(c.green("Git ready!"));
}
