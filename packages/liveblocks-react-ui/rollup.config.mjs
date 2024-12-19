/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createConfig } from "@liveblocks/rollup-config";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
/** @type {import('@liveblocks/rollup-config').Pkg} */
const pkg = require("./package.json");

export default createConfig({
  pkg,
  entries: ["src/index.ts", "src/primitives/index.ts", "src/_private/index.ts"],
  styles: [
    {
      entry: "src/styles/index.css",
      destination: "styles.css",
    },
    {
      entry: "src/styles/dark/media-query.css",
      destination: "styles/dark/media-query.css",
    },
    {
      entry: "src/styles/dark/attributes.css",
      destination: "styles/dark/attributes.css",
    },
  ],
});
