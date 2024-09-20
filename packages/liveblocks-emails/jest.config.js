/** @type {import('jest').Config} */

const commonJestConfig = require("@liveblocks/jest-config");

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  // Our standard setup assumed jsdom environment. Override it for node here.
  testEnvironment: "node",
};
