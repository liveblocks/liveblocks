import { createLiveblocksLibraryTsdownConfig } from "@liveblocks/tsdown-config";

import pkg from "./package.json" with { type: "json" };

export default createLiveblocksLibraryTsdownConfig({
  pkg,
  entry: ["src/index.ts", "src/suspense.ts", "src/_private.ts"],
});
