import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  nanoSleep,
  pickFrom,
  pickNumberOfUndoRedo,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/ydoc/text";

test.describe("Storage - Yjs Text", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("list insert text", async () => {
    const [page1] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#text", "");

    await page1.click("#set");
    await waitForJson(pages, "#text", "test text");

    await waitUntilEqualOnAllPages(pages, "#items");
  });
});
