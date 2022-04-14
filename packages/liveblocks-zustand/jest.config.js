// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  setupFiles: ["./jest.setup.js"],
};
