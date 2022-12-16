import esbuild from "esbuild";
import { esbuildOptions } from "./esbuild.js";
import { chmod, rm } from "fs/promises";

try {
  await rm("./dist", { recursive: true, force: true });
  await esbuild.build(esbuildOptions);
  await chmod(esbuildOptions.outfile, "755");
} catch (er) {
  console.error(er);
  process.exit(1);
}
