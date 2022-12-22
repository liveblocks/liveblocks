/** @type {import('jest').Config} */

// ------------------------------------------------------------------------------------------
// Copied from https://github.com/liveblocks/liveblocks/blob/main/shared/jest-config/index.js
const commonJestConfig = {
  // By default, assume Jest will be used in a DOM environment. If you need to
  // use "node", you can overwrite it in the project.
  testEnvironment: "jsdom",

  preset: "ts-jest",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  roots: ["<rootDir>/src"],

  // Ensure `window.fetch` is polyfilled if it isn't available in the runtime
  // setupFiles: ["@liveblocks/jest-config/fetch-polyfill"],
};
// ------------------------------------------------------------------------------------------

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  // Collect code coverage for this project
  collectCoverage: true,
  coveragePathIgnorePatterns: ["/__tests__/"],
};
