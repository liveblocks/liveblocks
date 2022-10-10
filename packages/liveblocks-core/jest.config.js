/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  setupFiles: ["./jest.setup.js"],
  roots: ["<rootDir>/src"],
};
