import { fileURLToPath } from "node:url";

import {
  buildStylesheets,
  dualFormatLibraryDefines,
  libraryNeverBundleDeps,
  libraryOutExtensionsTypeModule,
} from "@liveblocks/tsdown-config";
import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };

const packageDir = fileURLToPath(new URL(".", import.meta.url));

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

export default defineConfig({
  name: "@liveblocks/react-ui",
  entry: ["src/index.ts", "src/primitives/index.ts", "src/_private/index.ts"],
  unbundle: true,
  treeshake: false,
  platform: "browser",
  target: "es2022",
  hash: false,
  sourcemap: true,
  clean: true,
  dts: true,
  failOnWarn: false,
  outExtensions: libraryOutExtensionsTypeModule,
  deps: {
    neverBundle: libraryNeverBundleDeps(pkg),
  },
  format: dualFormatLibraryDefines(pkg.version),
  onSuccess: async () => {
    await buildStylesheets(STYLE_FILES, packageDir);
  },
});
