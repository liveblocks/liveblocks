/** @type {import('ts-jest').JestConfigWithTsJest} */
const commonJestConfig = require("@liveblocks/jest-config");

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  setupFiles: ["./jest.setup.js"],
};
