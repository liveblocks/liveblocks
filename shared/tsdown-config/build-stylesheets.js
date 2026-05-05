import fs from "fs";
import { createRequire } from "module";
import path from "path";
import postcss from "postcss";

/**
 * @typedef {Object} File
 * @property {string} entry
 * @property {string} destination
 */

const require = createRequire(import.meta.url);

/**
 * @param {string} file
 * @param {string | NodeJS.ArrayBufferView} data
 */
function createFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

/**
 * Generates a scale of [50,100...900] colors based on a contrast
 * variable, which indicates the lowest percentage of the scale.
 *
 * @param {string} from
 * @param {string} to
 * @param {string} contrast
 * @param {string} increment
 * @returns {string}
 */
function colorMixScale(from, to, contrast, increment) {
  const unit = `(100% - ${contrast}) / 9`;
  let percentage;

  if (Number(increment) === 50) {
    percentage = `calc(100% - ${contrast} + (${unit}) / 2)`;
  } else {
    const index = Math.floor(Number(increment) / 100) - 1;

    percentage = `calc(100% - ${
      index === 0
        ? contrast
        : `(${contrast} + ${index === 1 ? unit : `${index} * (${unit})`})`
    })`;
  }

  return `color-mix(in srgb, ${to}, ${from} ${percentage})`;
}

/**
 * Run the PostCSS pipeline used for published package stylesheets, writing CSS
 * and external source maps next to each destination path (relative to `cwd`).
 *
 * @param {File[]} styleFiles
 * @param {string} [cwd]
 * @returns {Promise<void>}
 */
export async function buildStylesheets(styleFiles, cwd = process.cwd()) {
  const processor = postcss([
    require("stylelint"),
    require("postcss-import"),
    require("postcss-advanced-variables"),
    require("postcss-functions")({
      functions: {
        "color-mix-scale": colorMixScale,
      },
    }),
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

  for (const file of styleFiles) {
    console.log(`🎨 Building ${file.entry}…`);

    const entry = path.resolve(cwd, file.entry);
    const destination = path.resolve(cwd, file.destination);

    const { css, map } = await processor.process(
      fs.readFileSync(entry, "utf8"),
      {
        from: entry,
        to: destination,
        map: {
          inline: false,
        },
      }
    );

    createFile(destination, css);
    createFile(`${destination}.map`, map.toString());
  }
}
