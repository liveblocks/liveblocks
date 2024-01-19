import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  genRoomId,
  preparePages,
  waitForJson,
  waitForTextContains,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/ydoc/subdoc";

test.describe("Yjs - Subdoc", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("sync, clear, and create subdoc", async () => {
    const [page1, page2] = pages;

    // wait for pages to sync
    await waitForJson(pages, "#sync", true);

    // clear text from page 1
    await page1.click("#clear");
    await waitForJson(pages, "#text", "{}");

    // insert subdoc on page 2
    await page2.click("#insert");

    await page1.waitForTimeout(500); // todo replace with waiting for subdoc to load
    // load subdoc on page 1
    await page1.click("#load");
    await waitForTextContains(pages, "#text", "test subdoc text");
  });
});
