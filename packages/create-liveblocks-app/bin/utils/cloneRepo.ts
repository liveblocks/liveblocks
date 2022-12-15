import degit from "degit";
import { existsSync } from "fs";
import { join } from "path";
import c from "ansi-colors";
import { loadingSpinner } from "./loadingSpinner.js";

type CloneRepo = {
  repoDir: string;
  appDir: string;
};

export async function cloneRepo({ repoDir, appDir }: CloneRepo) {
  const spinner = loadingSpinner().start("Downloading repo...");

  let finalResult = null;
  const emitter = degit(repoDir);

  emitter.on("info", (result) => {
    if (result.code === "SUCCESS") {
      // degit does not check if a dir exists, if package.json was copied then it exists
      if (existsSync(join(appDir, "./package.json"))) {
        finalResult = result;
      } else {
        spinner.fail(c.redBright.bold("Repo does not exist: ") + repoDir);
      }
    } else {
      spinner.fail(c.redBright.bold("Problem downloading repo"));
      console.log(result.message);
    }
  });

  try {
    await emitter.clone(appDir);
  } catch (err) {
    spinner.fail(c.redBright.bold("Problem downloading repo"));
    console.log(err);
  }

  if (finalResult) {
    spinner.succeed(c.green("Repo downloaded!"));
  }

  return finalResult;
}
