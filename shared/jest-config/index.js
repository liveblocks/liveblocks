/** @type {import('jest').Config} */

/**
 * Standard Jest configuration, used by all projects in this monorepo.
 */
module.exports = {
  // By default, assume Jest will be used in a DOM environment. If you need to
  // use "node", you can overwrite it in the project.
  testEnvironment: "jsdom",

  preset: "ts-jest",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  roots: ["<rootDir>/src"],

  // Ensure `window.fetch` are `window.TextEncoder` are polyfilled if they aren't available in the runtime
  setupFiles: [
    "@liveblocks/jest-config/fetch-polyfill",
    "@liveblocks/jest-config/textencoder-polyfill",
  ],
};
