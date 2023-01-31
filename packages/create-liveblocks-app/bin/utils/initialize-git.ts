import c from "ansi-colors";
import { loadingSpinner } from "./loading-spinner";
import { execAsync } from "./exec-async";
import { checkIfInsideRepo } from "./check-inside-repo";

export type RepoUrls = { https: string; ssh: string };

export async function initializeGit({
  appDir,
  repoUrls,
}: {
  appDir: string;
  repoUrls: null | RepoUrls;
}) {
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

    if (repoUrls) {
      const repoType = await detectRemoteRepoLocation({ appDir, repoUrls });
      if (repoType !== "none") {
        await execAsync(`git remote add origin ${repoUrls[repoType]}`, options);
      }
    }

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

async function detectRemoteRepoLocation({
  appDir,
  repoUrls,
}: {
  appDir: string;
  repoUrls: RepoUrls;
}): Promise<"none" | "https" | "ssh"> {
  return new Promise(async (res) => {
    const options = {
      cwd: appDir,
      stdio: "pipe",
    } as const;

    let complete = false;

    setTimeout(() => {
      if (!complete) {
        res("none");
      }
    }, 10000);

    try {
      await execAsync(`git ls-remote ${repoUrls.https}`, options);
      complete = true;
      res("https");
      return;
    } catch (err) {
      console.log("https error", err);
      try {
        await execAsync(`git ls-remote ${repoUrls.ssh}`, options);
        complete = true;
        res("ssh");
        return;
      } catch (err) {
        console.log("ssh error", err);
      }
    }

    res("none");
  });
}
