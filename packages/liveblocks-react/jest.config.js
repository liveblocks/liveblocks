// jest.config.js
module.exports = {
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  testPathIgnorePatterns: ["__tests__/_.*"],
  setupFiles: ["./jest.setup.js"],
};
