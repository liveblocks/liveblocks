/** @type {import('jest').Config} */

/**
 * Standard Jest configuration, used by all projects in this monorepo.
 */
module.exports = {
  preset: "ts-jest",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  roots: ["<rootDir>/src"],

  // Collect code coverage for this project
  collectCoverage: true,
  coveragePathIgnorePatterns: ["/__tests__/"],
};
