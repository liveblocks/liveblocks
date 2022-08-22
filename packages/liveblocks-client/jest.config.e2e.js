// jest.config.e2e.js
module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  roots: ["<rootDir>/e2e"],
};
