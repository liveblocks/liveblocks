module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  verbose: true,
  testTimeout: 60000,
  globalSetup: "./setup.js",
  globalTeardown: "./teardown.js",
};
