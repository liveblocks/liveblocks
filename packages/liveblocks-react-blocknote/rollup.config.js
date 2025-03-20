/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createConfig } from "@liveblocks/rollup-config";

import pkg from "./package.json" with { type: "json" };

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
