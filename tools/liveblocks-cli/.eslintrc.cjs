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

module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["license-header"],
  rules: {
    "license-header/header": ["error", "./resources/license-header.txt"],
  },
  overrides: [
    {
      files: ["src/**/*.ts", "test/**/*.ts"],
      extends: ["@liveblocks/eslint-config"],
      rules: {
        // Import sorting
        "import/no-duplicates": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",

        // Op/ClientMsg/ServerMsg imports should come from @liveblocks/server
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "ImportDeclaration[source.value='@liveblocks/core'] > ImportSpecifier[imported.name=/Op$/]",
            message: "Import Op types from `@liveblocks/server`, not core.",
          },
          {
            selector:
              "ImportDeclaration[source.value='@liveblocks/core'] > ImportSpecifier[imported.name='ClientMsg']",
            message: "Import `ClientMsg` from `@liveblocks/server`, not core.",
          },
          {
            selector:
              "ImportDeclaration[source.value='@liveblocks/core'] > ImportSpecifier[imported.name='ServerMsg']",
            message: "Import `ServerMsg` from `@liveblocks/server`, not core.",
          },
        ],
      },
    },
  ],
};
