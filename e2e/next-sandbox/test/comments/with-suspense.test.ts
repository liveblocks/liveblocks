import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  genRoomId,
  getJson,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

const TEST_URL = "http://localhost:3007/comments/with-suspense";

// These tests sometimes fail on CI, because some operations aren't coming
// through timely enough (or not at all) on the other end. We're still figuring
// out what's the cause of this.
// eslint-disable-next-line @typescript-eslint/unbound-method
const skipOnCI = process.env.CI ? test.skip : test;

test.describe("Comments", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  skipOnCI(
    "verify A and B display same number of threads after threads are loaded",
    async () => {
      await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
      await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });
    }
  );

  skipOnCI(
    "verify thread creation on B is broadcasted correctly to A",
    async () => {
      const [page1, page2] = pages;

      await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
      await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });

      // Read starting value n
      const n = (await getJson(page1, "#numOfThreads")) as number;

      await page1.click("#create-thread");
      await page2.click("#create-thread");
      await page2.click("#create-thread");
      await waitForJson(pages, "#numOfThreads", n + 3, { timeout: 15_000 });

      await page2.click("#delete-comment");
      await waitForJson(pages, "#numOfThreads", n + 3 - 1, { timeout: 15_000 });
    }
  );
});
