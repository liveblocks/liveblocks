import degit from "degit";
import { existsSync } from "fs";
import { join } from "path";
import c from "ansi-colors";
import { examplesUrl } from "./config.js";

type CloneRepo = {
  repoDir: string;
  appDir: string;
}

export async function cloneRepo({ repoDir, appDir }: CloneRepo) {
  let success = false;
  const emitter = degit(repoDir);

  emitter.on("info", ({ code, dest, message, repo }) => {
    if (code === "SUCCESS") {
      // @ts-ignore | Types from @types/degit are incorrect for `repo`
      const exampleName = repo.subdir.split("/").slice(-1)[0];

      // degit does not check if a dir exists, if package.json was copied then it exists
      if (existsSync(join(appDir, "./package.json"))) {
        success = true;
        console.log(c.bold("Cloning example:"));
        console.log(c.magentaBright(exampleName));
        console.log();
        console.log(c.bold("To location:"));
        console.log(c.greenBright(dest));
      } else {
        console.log(c.bold.red("Liveblocks repository does not exist:"));
        console.log(exampleName);
        console.log();
        console.log("Use with name of example:");
        console.log(c.bold.cyan("npx create-liveblocks-app nextjs-live-avatars"));
        console.log();
        console.log(c.bold("Find examples here:"));
        console.log(examplesUrl);
        console.log();
      }
    } else {
      console.log("Error cloning repository:");
      console.log(message);
    }
  });

  await emitter.clone(appDir);

  return success;
}
