/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createConfig } from "@liveblocks/rollup-config";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
/** @type {import('@liveblocks/rollup-config').Pkg} */
const pkg = require("./package.json");

export default createConfig({
  pkg,
  entries: ["src/index.ts"],
  styles: [
    {
      entry: "src/styles/index.css",
      destination: "styles.css",
    },
  ],
});
