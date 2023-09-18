import fs from "fs";
import path from "path";
import type { Plugin } from "rollup";

interface Options {
  directory: string;
}

export function clean({ directory }: Options): Plugin {
  return {
    name: "clean",
    buildStart: {
      order: "pre",
      handler() {
        fs.rmSync(path.resolve(directory), { recursive: true, force: true });
      },
    },
  };
}
