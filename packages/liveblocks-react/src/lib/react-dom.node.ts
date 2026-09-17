import { createRequire } from "node:module";

import { browser as commonJSBrowser } from "./react-dom";

let browser: unknown = commonJSBrowser;

// Bundlers can leave the optional require() unconverted in an ESM server bundle.
if (browser === undefined) {
  try {
    const require = createRequire(import.meta.url);
    const reactDOM: unknown = require("react-dom");
    if (
      typeof reactDOM === "object" &&
      reactDOM !== null &&
      "browser" in reactDOM
    ) {
      browser = reactDOM.browser;
    }
  } catch {
    // React DOM is an optional peer dependency.
  }
}

export { browser };
