const os = require("os");
const path = require("path");
const rimraf = require("rimraf");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");
module.exports = async function () {
  await Promise.all([
    global.__BROWSER_GLOBAL_A__.close(),
    global.__BROWSER_GLOBAL_B__.close(),
  ]);

  // clean-up the wsEndpoint file
  rimraf.sync(DIR);
};
