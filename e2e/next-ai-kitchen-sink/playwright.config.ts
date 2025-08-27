import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./test",
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 4 : 6,
  /* Fully parallel test execution */
  fullyParallel: true,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { title: "Liveblocks AI Kitchen Sink E2E Tests" }],
    ["github"],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    headless: process.env.CI || process.env.HEADLESS ? true : false,
    viewport: { width: 640, height: 800 },
    permissions: ["clipboard-write", "clipboard-read"],
    /* Maximum time each action such as `click()` can take. 10s local, 15s CI. */
    actionTimeout: process.env.CI ? 15000 : 10000,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "on-first-failure", // Only captures main page
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium", // Enable the use of New Headless mode in Chromium
      },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI
      ? "npm run start" // Test production builds on CI
      : "npm run dev", // Test dev builds on CI (with React StrictMode enabled)
    port: 3008, // AI kitchen sink port
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
