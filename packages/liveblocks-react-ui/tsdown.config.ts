import { createLiveblocksLibraryTsdownConfig } from "@liveblocks/tsdown-config";

import pkg from "./package.json" with { type: "json" };

const STYLE_FILES = [
  { entry: "src/styles/index.css", destination: "styles.css" },
  {
    entry: "src/styles/dark/media-query.css",
    destination: "styles/dark/media-query.css",
  },
  {
    entry: "src/styles/dark/attributes.css",
    destination: "styles/dark/attributes.css",
  },
];

export default createLiveblocksLibraryTsdownConfig({
  pkg,
  importMeta: import.meta,
  mode: "unbundle",
  entry: ["src/index.ts", "src/primitives/index.ts", "src/_private/index.ts"],
  styleFiles: STYLE_FILES,
});
