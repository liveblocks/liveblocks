// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  setupFiles: ["./jest.setup.js"],
  roots: ["<rootDir>/src"],
};
