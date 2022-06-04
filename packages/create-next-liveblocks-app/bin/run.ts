import degit from "degit";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export async function run () {
  console.log("running");

  const name = "my-app";

  const appDir = join(process.cwd(), "./" + name);

  if (!existsSync(appDir)) {
    mkdirSync(appDir);
  }

  const emitter = degit("liveblocks/liveblocks/examples/nextjs-live-avatars");

  emitter.on("info", ({ code, dest, message, repo }) => {
    if (code === "success") {
      // @ts-ignore | Types from @types/degit are incorrect for `repo`
      const { user, name, subdir } = repo;
      const fromHereToThere = `${user}/${name}/${subdir} to ${dest}`;
      console.log(`Cloned ${fromHereToThere}`);
    } else {
      console.log("Error cloning repository:");
      console.log(message);
    }
  });

  await emitter.clone(appDir);
  console.log("done");
}
