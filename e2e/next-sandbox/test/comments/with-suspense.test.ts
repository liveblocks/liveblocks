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

test.describe.skip("Comments", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test("verify A and B display same number of threads after threads are loaded", async () => {
    await waitForJson(pages, "#isLoading", false);
    await waitUntilEqualOnAllPages(pages, "#numOfThreads");
  });

  test("verify thread creation on B is broadcasted correctly to A", async () => {
    const [page1, page2] = pages;

    await waitForJson(pages, "#isLoading", false);

    const numOfThreads = (await getJson(page1, "#numOfThreads")) as number;

    await page2.click("#create-thread");
    await waitForJson(page1, "#numOfThreads", numOfThreads + 1);

    await page2.click("#delete-comment");
    await waitUntilEqualOnAllPages(pages, "#numOfThreads");
  });
});
