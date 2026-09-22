import { mkdtemp, rm } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "tsup";

import pkg from "../package.json" with { type: "json" };

const packageDirectory = fileURLToPath(new URL("../", import.meta.url));
const nativeReplacements: Record<string, string> = pkg["react-native"];
const directory = await mkdtemp(join(tmpdir(), "liveblocks-browser-"));
const entry = Object.fromEntries(
  ["index", "suspense", "_private"].flatMap((name) =>
    ["js", "cjs"].map((extension) => [
      `${name}-${extension}`,
      join(packageDirectory, "dist", `${name}.${extension}`),
    ])
  )
);

try {
  for (const platform of ["native", "web"]) {
    await build({
      config: false,
      entry,
      outDir: join(directory, platform),
      format: ["esm"],
      platform: "browser",
      splitting: false,
      silent: true,
      noExternal: [/.*/],
      esbuildPlugins: [
        {
          name: "react-native-resolution",
          setup(build) {
            build.onResolve({ filter: /.*/ }, ({ path, importer }) => {
              if (isBuiltin(path) || path.startsWith("react-dom/")) {
                return { errors: [{ text: `Unexpected dependency: ${path}` }] };
              }
              if (path === "react-dom") {
                return platform === "native"
                  ? { errors: [{ text: "Native bundle imports React DOM" }] }
                  : { path, namespace: "old-react-dom" };
              }
              if (path.startsWith(".")) {
                const source = relative(
                  packageDirectory,
                  resolve(dirname(importer), path)
                )
                  .split(sep)
                  .join("/");
                const replacement = nativeReplacements[`./${source}`];
                if (replacement) {
                  return {
                    path: resolve(
                      packageDirectory,
                      `${replacement}.${platform}.js`
                    ),
                  };
                }
              }
              return undefined;
            });
            // Older React DOM versions have no browser export.
            build.onLoad({ filter: /.*/, namespace: "old-react-dom" }, () => ({
              contents: "export {};",
              loader: "js",
            }));
          },
        },
      ],
    });
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
