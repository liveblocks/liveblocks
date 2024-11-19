import replace from '@rollup/plugin-replace';
import { createRequire } from 'module';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import preserveDirectives from 'rollup-plugin-preserve-directives';
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

let hasRun$1 = false;
function clean({ directory }) {
    return {
        name: "clean",
        buildStart: {
            order: "pre",
            handler() {
                if (!hasRun$1) {
                    fs.rmSync(path.resolve(directory), { recursive: true, force: true });
                }
                hasRun$1 = true;
            },
        },
    };
}

/* eslint-disable @typescript-eslint/no-unsafe-call */
const require = createRequire('file:///Users/yousef/Programming/liveblocks/packages/liveblocks-react-tiptap/plugins/rollup/styles.ts');
function createFile(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
}
let hasRun = false;
function styles({ files }) {
    return {
        name: "styles",
        buildStart: async () => {
            if (hasRun) {
                return;
            }
            const processor = postcss([
                require("stylelint"),
                require("postcss-import"),
                require("postcss-advanced-variables"),
                require("postcss-nesting"),
                require("postcss-combine-duplicated-selectors"),
                require("postcss-sort-media-queries"),
                require("postcss-lightningcss")({ browsers: ">= 1%" }),
                require("postcss-reporter")({
                    clearReportedMessages: true,
                    plugins: ["stylelint"],
                    noPlugin: true,
                    throwError: true,
                }),
            ]);
            for (const file of files) {
                console.log(`🎨 Building ${file.entry}…`);
                const entry = path.resolve(file.entry);
                const destination = path.resolve(file.destination);
                const { css, map } = await processor.process(fs.readFileSync(entry, "utf8"), {
                    from: entry,
                    to: destination,
                    map: {
                        inline: false,
                    },
                });
                createFile(destination, css);
                createFile(`${destination}.map`, map.toString());
            }
            hasRun = true;
        },
    };
}

const SRC_DIR = "src";
const DIST_DIR = "dist";
const ENTRIES = [`${SRC_DIR}/index.ts`];
const pkg = createRequire('file:///Users/yousef/Programming/liveblocks/packages/liveblocks-react-tiptap/rollup.config.ts')("./package.json");
// Match dependencies exactly or with any subpath
function createExternals(dependencies) {
    return dependencies.map((dependency) => new RegExp(`^${dependency}(/.*)?$`));
}
function createMainConfig(format) {
    const output = format === "cjs"
        ? {
            dir: DIST_DIR,
            preserveModules: true,
            preserveModulesRoot: SRC_DIR,
            format: "cjs",
            sourcemap: true,
        }
        : {
            dir: DIST_DIR,
            entryFileNames: "[name].mjs",
            preserveModules: true,
            preserveModulesRoot: SRC_DIR,
            format: "esm",
            sourcemap: true,
        };
    return {
        input: ENTRIES,
        external: [
            ...createExternals([
                ...Object.keys(pkg.dependencies),
                ...Object.keys(pkg.peerDependencies),
            ]),
            // "react-dom" is an implicit peer dependency
            "react-dom",
        ],
        output,
        treeshake: false,
        plugins: [
            esbuild({
                target: "es2020",
                sourceMap: true,
            }),
            preserveDirectives(),
            replace({
                values: {
                    __VERSION__: JSON.stringify(pkg.version),
                    ROLLUP_FORMAT: JSON.stringify(format),
                },
                preventAssignment: true,
            }),
            // Clean dist directory
            clean({ directory: DIST_DIR }),
            // Build .css files
            styles({
                files: [
                    {
                        entry: `${SRC_DIR}/styles/index.css`,
                        destination: "styles.css",
                    },
                ],
            }),
        ],
        onwarn(warning, warn) {
            if (warning.code === "MODULE_LEVEL_DIRECTIVE" &&
                warning.message.includes("use client")) {
                return;
            }
            warn(warning);
        },
    };
}
function createTypesConfigs() {
    return ENTRIES.map((input) => ({
        input,
        output: [
            {
                file: input
                    .replace(`${SRC_DIR}/`, `${DIST_DIR}/`)
                    .replace(/\.ts$/, ".d.ts"),
            },
            {
                file: input
                    .replace(`${SRC_DIR}/`, `${DIST_DIR}/`)
                    .replace(/\.ts$/, ".d.mts"),
            },
        ],
        plugins: [dts()],
    }));
}
const configs = [
    // Build .js and .mjs files
    createMainConfig("cjs"),
    createMainConfig("esm"),
    // Build .d.ts and .d.mts files
    ...createTypesConfigs(),
];

export { configs as default };
