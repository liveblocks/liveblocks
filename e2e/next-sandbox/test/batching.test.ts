import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "./utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/batching";

test.describe("Storage - Batching", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("update storage and presence", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await expectJson(page1, "#numItems", 0);

    await page1.click("#update-storage-presence-batch");
    await expectJson(page1, "#numItems", 1);

    await waitUntilEqualOnAllPages(pages, "#items");

    await expectJson(page1, "#theirPresence", {});
    await expectJson(page2, "#theirPresence", { count: 1 });

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });

  // TODO Add tests using the undo/redo buttons
});
