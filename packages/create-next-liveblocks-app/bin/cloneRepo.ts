import degit from "degit";
import { existsSync } from "fs";
import { join } from "path";
import c from "ansi-colors";

export async function cloneRepo(repoDir: string, appDir: string) {
  let success = false;
  const emitter = degit(repoDir);

  emitter.on("info", ({ code, dest, message, repo }) => {
    if (code === "SUCCESS") {
      // @ts-ignore | Types from @types/degit are incorrect for `repo`
      const exampleName = repo.subdir.split("/").slice(-1);

      // degit does not check if a dir exists, if package was copied then it exists
      if (existsSync(join(appDir, "./package.json"))) {
        success = true;
        console.log(c.bold("Cloning starter kit:"));
        console.log(c.magentaBright(exampleName));
        console.log();
        console.log(c.bold("To location:"));
        console.log(c.greenBright(dest));
      } else {
        console.log("Error: Liveblocks repository does not exist");
      }
    } else {
      console.log("Error cloning repository:");
      console.log(message);
    }
  });

  await emitter.clone(appDir);

  return success;
}
