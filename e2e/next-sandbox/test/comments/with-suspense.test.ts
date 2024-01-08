import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  getJson,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

const TEST_URL = "http://localhost:3007/comments/with-suspense";

test.describe("Comments", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test("verify A and B display same number of threads after threads are loaded", async () => {
    await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
    await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });
  });

  test("verify thread creation and deletion on B is broadcasted correctly to A", async () => {
    const [page1] = pages;

    await waitForJson(pages, "#isLoading", false, { timeout: 15_000 });
    await waitUntilEqualOnAllPages(pages, "#numOfThreads", { interval: 250 });

    // Read starting value n
    const n = (await getJson(page1, "#numOfThreads")) as number;

    // Create a new thread on page1
    await page1.click("#create-thread");

    // Verify that the number of threads on page1 is updated optimistically
    expectJson(page1, "#numOfThreads", n + 1);

    // Verify that the number of threads on both pages are updated
    await waitForJson(pages, "#numOfThreads", n + 1, { timeout: 30_000 });

    // Delete the newly created thread on page1
    await page1.click("#delete-comment");

    // // Verify that the number of threads on page1 is updated optimistically
    expectJson(page1, "#numOfThreads", n + 1 - 1);

    // Verify that the number of threads on both pages are updated
    await waitForJson(pages, "#numOfThreads", n + 1 - 1, { timeout: 30_000 });
  });
});
