import { createConfig } from "@liveblocks/tsup-config";

export default createConfig([
  "src/index.ts",
  "src/suspense.ts",
  "src/_private.ts",
]);
