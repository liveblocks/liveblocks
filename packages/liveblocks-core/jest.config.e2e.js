/** @type {import('ts-jest').JestConfigWithTsJest} */
const commonJestConfig = require("@liveblocks/jest-config");

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  // Our standard setup assumed jsdom environment. Override it for node here.
  testEnvironment: "node",
  testTimeout: 30000,

  roots: ["<rootDir>/e2e"],
};
