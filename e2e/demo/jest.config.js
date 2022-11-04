/** @type {import('jest').Config} */

module.exports = {
  globalSetup: "./setup.js",
  globalTeardown: "./teardown.js",
  testEnvironment: "./puppeteer_environment.js",
};
