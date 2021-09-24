module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  verbose: true,
  testTimeout: 6000000,
  globalSetup: "./setup.js",
  globalTeardown: "./teardown.js",
};
