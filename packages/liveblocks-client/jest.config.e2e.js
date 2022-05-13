// jest.config.e2e.js
module.exports = {
  testEnvironment: "node",
  testTimeout: 10000,
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  roots: ["<rootDir>/e2e"],
};
