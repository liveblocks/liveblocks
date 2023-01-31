import c from "ansi-colors";
import { loadingSpinner } from "./loading-spinner";
import path from "path";
import { simpleGit, SimpleGitOptions } from "simple-git";

type ClonePrivateRepo = {
  appDir: string;
  repoUrls: { https: string; ssh: string };
};

export async function clonePrivateRepo({
  appDir,
  repoUrls,
}: ClonePrivateRepo): Promise<boolean> {
  const spinner = loadingSpinner().start("Cloning repo...");

  const { dir, name } = path.parse(appDir);

  // Using simple-git for the timeout functionality
  const options: Partial<SimpleGitOptions> = {
    baseDir: dir,
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
    timeout: { block: 2000 },
  };

  const git = simpleGit(options);

  try {
    await git.clone(repoUrls.ssh, name);
    spinner.succeed(c.green("Repo downloaded!"));
    return true;
  } catch (err) {}

  try {
    await git.clone(repoUrls.https, name);
    spinner.succeed(c.green("Repo downloaded!"));
    return true;
  } catch (err) {}

  spinner.warn(
    c.yellowBright.bold(
      `Problem cloning private repo", using public repo instead`
    )
  );
  return false;
}
