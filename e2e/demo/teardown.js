const os = require("os");
const path = require("path");
const rimraf = require("rimraf");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");
module.exports = async function () {
  // Close all browsers
  for (const browser of global.__BROWSERS__) {
    await browser.close();
  }
  // clean-up the temporary file used to write the browsers wsEndpoints
  rimraf.sync(DIR);
};
