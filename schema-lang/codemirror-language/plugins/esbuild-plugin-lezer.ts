import { buildParserFile } from "@lezer/generator";
import type { Plugin } from "esbuild";
import fs from "fs/promises";
import path from "path";

const PLUGIN = "esbuild-plugin-lezer";

// https://github.com/lezer-parser/generator/blob/main/src/rollup-plugin-lezer.js.
export const lezer: Plugin = {
  name: PLUGIN,
  setup: (build) => {
    build.onResolve({ filter: /^(.*\.grammar)(\.terms)?$/ }, (args) => {
      return {
        path: path.resolve(path.dirname(args.importer), args.path),
        namespace: PLUGIN,
      };
    });

    build.onLoad({ filter: /.*/, namespace: PLUGIN }, async (args) => {
      const [, grammar, terms] =
        /^\0?(.*\.grammar)(\.terms)?$/.exec(args.path) ?? [];

      if (!grammar) {
        return null;
      }

      const code = await fs.readFile(grammar, "utf8");

      const build = buildParserFile(code, {
        fileName: grammar,
        moduleStyle: "esm",
      });

      return {
        contents: terms ? build.terms : build.parser,
        loader: "js",
      };
    });
  },
};
