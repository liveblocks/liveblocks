import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, rm, symlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "tsup";

const require = createRequire(import.meta.url);
const reactDOM: unknown = require("react-dom");
assert(typeof reactDOM === "object" && reactDOM !== null);

let browserLoaded = false;

Object.defineProperty(reactDOM, "browser", {
  get() {
    browserLoaded = true;
    return () => Object.freeze({});
  },
});

await import("../dist/suspense.js");

assert(browserLoaded, "The ESM entry did not load React DOM's browser export");

const directory = await mkdtemp(join(tmpdir(), "liveblocks-browser-"));

try {
  await build({
    config: false,
    entry: {
      browser: fileURLToPath(new URL("../dist/react-dom.cjs", import.meta.url)),
      client: fileURLToPath(new URL("../dist/suspense.js", import.meta.url)),
      clientCommonJS: fileURLToPath(
        new URL("../dist/suspense.cjs", import.meta.url)
      ),
    },
    outDir: directory,
    outExtension: () => ({ js: ".mjs" }),
    format: ["esm"],
    platform: "browser",
    splitting: false,
    silent: true,
    noExternal: ["react-dom"],
    esbuildPlugins: [
      {
        name: "react-dom-browser-fixture",
        setup(build) {
          // Older Metro resolvers cannot load package imports.
          build.onResolve({ filter: /^#/ }, ({ path }) => ({
            errors: [
              {
                text: `Package import ${path} is not supported by older Metro`,
              },
            ],
          }));
          build.onResolve({ filter: /^react-dom$/ }, () => ({
            path: "react-dom",
            namespace: "browser-fixture",
          }));
          build.onLoad({ filter: /.*/, namespace: "browser-fixture" }, () => ({
            contents: 'export function browser() { return "browser"; }',
            loader: "js",
          }));
        },
      },
    ],
  });

  const bundled: unknown = (
    await import(pathToFileURL(join(directory, "browser.mjs")).href)
  ).default;
  assert(typeof bundled === "object" && bundled !== null);
  assert("browser" in bundled);
  assert.equal(
    typeof bundled.browser,
    "function",
    "The bundled helper did not load React DOM's browser export"
  );

  await copyFile(
    new URL("../dist/react-dom.cjs", import.meta.url),
    join(directory, "react-dom.cjs")
  );
  await copyFile(
    new URL("../dist/react-dom.node.js", import.meta.url),
    join(directory, "react-dom.node.mjs")
  );

  // pnpm's NODE_PATH can supply React DOM even when the fixture has no peers.
  execFileSync(process.execPath, [
    "--no-global-search-paths",
    "--input-type=module",
    "--eval",
    `import assert from "node:assert/strict";
     const { browser } = await import(${JSON.stringify(
       pathToFileURL(join(directory, "react-dom.node.mjs")).href
     )});
     assert.equal(browser, undefined);`,
  ]);

  await symlink(
    fileURLToPath(new URL("../node_modules", import.meta.url)),
    join(directory, "node_modules"),
    "dir"
  );
  await import(pathToFileURL(join(directory, "client.mjs")).href);
  browserLoaded = false;

  await build({
    config: false,
    entry: {
      server: fileURLToPath(new URL("../dist/suspense.js", import.meta.url)),
    },
    outDir: directory,
    outExtension: () => ({ js: ".mjs" }),
    format: ["esm"],
    platform: "node",
    splitting: false,
    silent: true,
    external: ["react", "react-dom", "@liveblocks/client", "@liveblocks/core"],
  });

  await import(pathToFileURL(join(directory, "server.mjs")).href);
  assert(
    browserLoaded,
    "The ESM server bundle did not load the external React DOM peer"
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
