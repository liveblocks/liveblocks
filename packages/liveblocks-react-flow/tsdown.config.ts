import { createLiveblocksLibraryTsdownConfig } from "@liveblocks/tsdown-config";

import pkg from "./package.json" with { type: "json" };

const STYLE_FILES = [
  { entry: "src/styles/index.css", destination: "styles.css" },
];

export default createLiveblocksLibraryTsdownConfig({
  pkg,
  importMeta: import.meta,
  mode: "unbundle",
  entry: ["src/index.ts", "src/node.ts"],
  styleFiles: STYLE_FILES,
});
