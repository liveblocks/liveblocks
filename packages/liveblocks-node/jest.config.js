/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  roots: ["<rootDir>/src"],
};
