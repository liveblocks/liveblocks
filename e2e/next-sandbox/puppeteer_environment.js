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
    // get the wsEndpoint
    const wsEndpointA = await readFile(path.join(DIR, "wsEndpointA"), "utf8");
    const wsEndpointB = await readFile(path.join(DIR, "wsEndpointB"), "utf8");
    if (!wsEndpointA || !wsEndpointB) {
      throw new Error("wsEndpoint not found");
    }

    // connect to puppeteer
    this.global.browserA = await puppeteer.connect({
      browserWSEndpoint: wsEndpointA,
    });
    this.global.browserB = await puppeteer.connect({
      browserWSEndpoint: wsEndpointB,
    });
  }

  async teardown() {
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = PuppeteerEnvironment;
