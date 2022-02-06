// setup.js
const { writeFile } = require("fs").promises;
const os = require("os");
const path = require("path");
const mkdirp = require("mkdirp");
const puppeteer = require("puppeteer");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");

const WIDTH = 640;
const HEIGHT = 800;

module.exports = async function () {
  const browserA = await puppeteer.launch({
    headless: true,
    args: [
      `--no-sandbox`,
      `--disable-setuid-sandbox`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--window-position=0,0`,
      "--disable-dev-shm-usage",
    ],
  });
  global.__BROWSER_GLOBAL_A__ = browserA;

  const browserB = await puppeteer.launch({
    headless: true,
    args: [
      `--no-sandbox`,
      `--disable-setuid-sandbox`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--window-position=${WIDTH},0`,
      "--disable-dev-shm-usage",
    ],
  });
  global.__BROWSER_GLOBAL_B__ = browserB;

  // use the file system to expose the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  await writeFile(path.join(DIR, "wsEndpointA"), browserA.wsEndpoint());
  await writeFile(path.join(DIR, "wsEndpointB"), browserB.wsEndpoint());
};
