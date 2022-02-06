const { readFile } = require("fs").promises;
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer");
const NodeEnvironment = require("jest-environment-node");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");

class PuppeteerEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();

    const wsEndpoints = await readFile(path.join(DIR, "wsEndpoints"), "utf8");

    this.global.browsers = [];

    for (const wsEndpoint of wsEndpoints.split("\n")) {
      // Connect puppeteer to the browsers we created during the global setup
      this.global.browsers.push(
        await puppeteer.connect({
          browserWSEndpoint: wsEndpoint,
          defaultViewport: null,
        })
      );
    }
  }
}

module.exports = PuppeteerEnvironment;
