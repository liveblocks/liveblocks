const { mkdir, writeFile } = require("fs").promises;
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");
const NUMBER_OF_BROWSERS = 2;
const WIDTH = 640;
const HEIGHT = 480;

module.exports = async function () {
  const browsers = [];

  // Launch browsers side to side
  for (let i = 0; i < NUMBER_OF_BROWSERS; i++) {
    const browser = await puppeteer.launch({
      headless: false,
      // Chrome additional arguments to set browser size and position
      args: [
        `--window-size=${WIDTH},${HEIGHT}`,
        `--window-position=${WIDTH * i},0`,
      ],
    });

    browsers.push(browser);
  }

  // use the file system to expose the browsers wsEndpoint for TestEnvironments
  await mkdir(DIR, { recursive: true });
  await writeFile(
    path.join(DIR, "wsEndpoints"),
    browsers.map((browser) => browser.wsEndpoint()).join("\n")
  );

  // store all browser instances so we can teardown them later
  // this global is only available in the teardown but not in TestEnvironments
  global.__BROWSERS__ = browsers;
};
