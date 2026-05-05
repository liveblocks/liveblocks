import { fileURLToPath } from "node:url";

import {
  buildStylesheets,
  dualFormatLibraryDefines,
  libraryNeverBundleDeps,
  libraryOutExtensionsTypeModule,
  preserveUseClientPlugin,
} from "@liveblocks/tsdown-config";
import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };

const packageDir = fileURLToPath(new URL(".", import.meta.url));

const STYLE_FILES = [
  { entry: "src/styles/index.css", destination: "styles.css" },
];

export default defineConfig({
  name: "@liveblocks/react-blocknote",
  entry: ["src/index.ts"],
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
  plugins: [preserveUseClientPlugin()],
  onSuccess: async () => {
    await buildStylesheets(STYLE_FILES, packageDir);
  },
});
