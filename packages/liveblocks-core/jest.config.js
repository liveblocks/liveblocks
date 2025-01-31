/** @type {import('jest').Config} */

const commonJestConfig = require("@liveblocks/jest-config");

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  // Collect code coverage for this project, when using the --coverage flag
  coveragePathIgnorePatterns: ["/__tests__/"],
};
