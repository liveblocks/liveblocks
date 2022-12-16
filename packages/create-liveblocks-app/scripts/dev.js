import esbuild from "esbuild";
import { esbuildOptions } from "./esbuild.js";

esbuild
  .build({
    ...esbuildOptions,
    watch: {
      onRebuild() {
        process.stdout.clearLine();
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine();
        process.stdout.write("Rebuilt at " + new Date().toLocaleTimeString());
        process.stdout.write("\n");
      },
    },
  })
  .then(() => {
    process.stdout.write("\n");
    process.stdout.write("Watching for changes...");
    process.stdout.write("\n");
    process.stdout.write("\n");
  })
  .catch(() => process.exit(1));
