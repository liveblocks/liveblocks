import c from "ansi-colors";
import { loadingSpinner } from "./loading-spinner";
import { execAsync } from "./exec-async";
import path from "path";

type ClonePrivateRepo = {
  privateRepoDir: string;
  appDir: string;
};

export async function clonePrivateRepo({
  privateRepoDir,
  appDir,
}: ClonePrivateRepo): Promise<boolean> {
  const spinner = loadingSpinner().start("Cloning repo...");
  const { dir, name } = path.parse(appDir);

  const options = {
    cwd: dir,
    stdio: "pipe",
  } as const;

  try {
    await execAsync(`git clone ${privateRepoDir} ${name}`, options);
  } catch (err) {
    spinner.warn(
      c.yellowBright.bold(
        `Problem cloning "${privateRepoDir}", using public repo instead`
      )
    );
    return false;
  }

  spinner.succeed(c.green("Repo downloaded!"));
  return true;
}
