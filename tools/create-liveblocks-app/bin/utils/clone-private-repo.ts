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
  const { dir, name } = path.parse(appDir);

  // Using simple-git for the timeout functionality
  const options: Partial<SimpleGitOptions> = {
    baseDir: dir,
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
    timeout: { block: 8000 },
  };

  const git = simpleGit(options);

  try {
    await git.clone(repoUrls.ssh, name);
    return true;
  } catch (err) {}

  try {
    await git.clone(repoUrls.https, name);
    return true;
  } catch (err) {}

  return false;
}
