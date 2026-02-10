/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  // dts: true,  // Not needed for the CLI
  splitting: true,
  clean: true,
  target: "esnext",
  format: [
    "esm",
    // "cjs",  // Not needed for the CLI
  ],
  minify: true,

  // Bun-only modules — left as bare imports for Bun to resolve at runtime
  external: ["bun", "bun:sqlite"],

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);

    // Inline .html files as text strings
    options.loader = { ...options.loader, ".html": "text" };
  },
});
