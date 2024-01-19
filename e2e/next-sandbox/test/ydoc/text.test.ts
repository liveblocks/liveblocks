import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { genRoomId, preparePages, waitForJson } from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/ydoc/text";

test.describe("Yjs - Text", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("sync, clear, and insert text", async () => {
    const [page1, page2] = pages;

    // wait for pages to sync
    await waitForJson(pages, "#sync", true);

    // clear text from page 1
    await page1.click("#clear");
    await waitForJson(pages, "#text", "");

    // insert text on page 2
    await page2.click("#insert");
    await waitForJson(pages, "#text", "test text");
  });

  test("support text greather than 128k", async () => {
    const [page1, page2] = pages;

    // wait for pages to sync
    await waitForJson(pages, "#sync", true);

    // clear text from page 1
    await page1.click("#clear");
    await waitForJson(pages, "#text", "");

    // insert text on page 2
    await page2.click("#largeText");
    await waitForJson(pages, "#text", "yjs ".repeat(50_000));
  });
});
