// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  setupFiles: ["./jest.setup.js"],
};
