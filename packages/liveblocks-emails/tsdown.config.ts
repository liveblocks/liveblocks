import { createLiveblocksLibraryTsdownConfig } from "@liveblocks/tsdown-config";

import pkg from "./package.json" with { type: "json" };

export default createLiveblocksLibraryTsdownConfig({
  pkg,
  entry: "src/index.ts",
});
