/** @type {import('jest').Config} */

/**
 * Standard Jest configuration, used by all projects in this monorepo.
 */
module.exports = {
  // By default, assume Jest will be used in a DOM environment. If you need to
  // use "node", you can overwrite it in the project.
  testEnvironment: "jsdom",

  preset: "ts-jest",

  // NOTE: See https://github.com/kulshekhar/ts-jest/issues/4081#issuecomment-1503684089
  transform: {
    ".tsx?": [
      "ts-jest",
      {
        // Note: We shouldn't need to include `isolatedModules` here because it's a deprecated config option in TS 5,
        // but setting it to `true` fixes the `ESM syntax is not allowed in a CommonJS module when
        // 'verbatimModuleSyntax' is enabled` error that we're seeing when running our Jest tests.
        isolatedModules: true,
        useESM: true,
      },
    ],
  },

  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*", "__tests__/(.+/)*_.*"],
  roots: ["<rootDir>/src"],

  // Jest by default still assumes CJS imports, even if the package uses `type:
  // "module"`. These two settings tell Jest that, yes, really, we want to use
  // ESM imports. But really, we should switch to Vitest everywhere.
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.jsx?$": "$1",
  },

  // Ensure `window.fetch` is polyfilled if it isn't available in the runtime
  setupFiles: ["@liveblocks/jest-config/fetch-polyfill"],
};
