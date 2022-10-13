const commonJestConfig = require("@liveblocks/jest-config");

module.exports = {
  // Our standard Jest configuration, used by all projects in this monorepo
  ...commonJestConfig,

  // transform: {
  //   "^.+\\.tsx?$": "ts-jest",
  // },

  testTimeout: 6000000,
  verbose: true,
};
