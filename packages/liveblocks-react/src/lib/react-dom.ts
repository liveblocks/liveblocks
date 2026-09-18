let browser: unknown;

try {
  // Optional loading must stay synchronous, including in ESM builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

export { browser };
