import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  genRoomId,
  getJson,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

const TEST_URL = "http://localhost:3007/comments";

test.describe("Comments", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test.skip("verify A and B display same number of threads after threads are loaded", async () => {
    await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
    await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });
  });

  test("verify thread creation and deletion on A is broadcasted correctly to B", async () => {
    const [page1] = pages;

    await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
    await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });

    // Read starting value n
    const n = (await getJson(page1, "#numOfThreads")) as number;

    await page1.click("#create-thread");
    await waitForJson(pages, "#numOfThreads", n + 1, { timeout: 30_000 });

    await page1.click("#delete-comment");
    await waitForJson(pages, "#numOfThreads", n, { timeout: 30_000 });
  });

  test.skip("verify thread creation on A and B are broadcasted correctly to each other", async () => {
    const [page1, page2] = pages;

    await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
    await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });

    // Read starting value n
    const n = (await getJson(page1, "#numOfThreads")) as number;

    await page1.click("#create-thread");
    await page1.click("#create-thread");
    await page2.click("#create-thread");
    await page2.click("#create-thread");
    await waitForJson(pages, "#numOfThreads", n + 4, { timeout: 15_000 });
  });
});
