/**
 * This file will auto-generate the PEG config to use to build a type-safe
 * parser. This configuration is needed for the ts-pegjs plugin, which
 * generates a TypeScript parser, instead of a JavaScript parser.
 * Unfortunately, there is no way to annotate the return types inside the
 * *.pegjs file directly, and therefore this extra bit of configuration is
 * needed.
 *
 * Fortunately, we can completely auto-generate it, so we don't have to
 * maintain it.
 *
 */

const fs = require("fs");

const types = fs
  .readFileSync("src/ast/index.ts", "utf-8")
  .split("\n")
  .filter((line) => line.startsWith("export type "))
  .map((line) => line.split(" ")[2])
  .sort();

const returnTypes = {};
for (const type of types) {
  returnTypes[type] = `ast.${type}`;
  returnTypes[type + "List"] = `ast.${type}[]`;
}

const config = {
  tspegjs: {
    customHeader: 'import * as ast from "../ast";\n',
  },
  returnTypes,
};

fs.writeFileSync("pegconfig.json", JSON.stringify(config, null, 2) + "\n");
