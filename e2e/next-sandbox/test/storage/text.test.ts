import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  genRoomId,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/storage/text";

test.describe("Storage - LiveText", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test("syncs text and range attributes", async () => {
    const [page1, page2] = pages;

    await waitForJson(pages, "#plainText", "Hello");
    await waitForJson(pages, "#text", [{ insert: "Hello" }]);

    await page1.click("#insert");
    await waitForJson(pages, "#plainText", "Hello world");
    await waitUntilEqualOnAllPages(pages, "#text");

    await page2.click("#format");
    await waitForJson(pages, "#text", [
      { insert: "Hello", attributes: { bold: true } },
      { insert: " world" },
    ]);

    await page1.click("#unformat");
    await waitForJson(pages, "#text", [{ insert: "Hello world" }]);

    await page2.click("#delete");
    await waitForJson(pages, "#plainText", "ello world");
    await waitForJson(pages, "#text", [{ insert: "ello world" }]);
  });
});
