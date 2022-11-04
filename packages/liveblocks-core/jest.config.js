/** @type {import('jest').Config} */

const commonJestConfig = require("@liveblocks/jest-config");

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  // Collect code coverage for this project
  collectCoverage: true,
  coveragePathIgnorePatterns: ["/__tests__/"],
};
