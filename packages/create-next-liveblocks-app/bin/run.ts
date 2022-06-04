import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import commandLineArgs from "command-line-args";
import { cloneRepo } from "./cloneRepo.js";
import { getTemplatePath, commandLineFlags } from "./config.js";
import getPackageManager from "./getPackageManager.js";

export async function run () {
  const name = "my-app";
  const packageManager = getPackageManager();
  const appDir = join(process.cwd(), "./" + name);

  if (!existsSync(appDir)) {
    mkdirSync(appDir);
  }

  const repoDir = getTemplatePath(commandLineArgs(commandLineFlags));

  const cloneRepoSuccess = await cloneRepo(repoDir, appDir);

  if (!cloneRepoSuccess) {
    return
  }

  execSync(`${packageManager} install`, {
    cwd: appDir,
    stdio: 'inherit',
  });

  console.log("done");
}
