// jest.config.js
// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
};

module.exports = config;

// Or async function
module.exports = async () => {
  return {
    preset: "jest-puppeteer",
    verbose: true,
    testTimeout: 60000,
  };
};
