import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { cloneRepo } from "./cloneRepo.js";

export async function run () {
  const name = "my-app";

  const appDir = join(process.cwd(), "./" + name);

  if (!existsSync(appDir)) {
    mkdirSync(appDir);
  }

  const repoDir = "liveblocks/liveblocks/examples/nextjs-live-avatars";

  const cloneRepoSuccess = await cloneRepo(repoDir, appDir);

  if (!cloneRepoSuccess) {
    return
  }

  console.log("done");
}
