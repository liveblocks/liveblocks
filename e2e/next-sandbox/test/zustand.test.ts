import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import type { IDSelector } from "./utils";
import {
  expectJson,
  genRoomId,
  nanoSleep,
  pickFrom,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
  waitUntilFlushed,
} from "./utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/zustand";

test.describe("Zustand", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("array push basic", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(page1, "#numItems", 0);

    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#push");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#push");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#items");
    await expectJson(page2, "#numItems", 7);

    await page1.click("#clear");
    await waitUntilFlushed();
    await waitForJson(pages, "#numItems", 0);
  });

  test("array push basic + presence", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(page1, "#numItems", 0);

    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await waitForJson(page2, "#theirPresence", { name: "Vincent", counter: 1 });

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#inc-counter");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#inc-counter");
    await waitUntilEqualOnAllPages(pages, "#items");
    await expectJson(page2, "#numItems", 5);

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(page2, "#theirPresence", { name: "Vincent", counter: 3 });
  });

  test("with enter and leave room", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    await page1.click("#push");
    await page1.click("#push");
    await expectJson(page1, "#numItems", 2);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page2.click("#leave");

    await page1.click("#push");

    await page2.click("#enter"); // Enter
    await waitForJson(page1, "#numItems", 3);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });

  function fuzzyTest(actions: readonly IDSelector[]) {
    return async () => {
      const [page1, page2] = pages;
      await page1.click("#clear");
      await waitForJson(pages, "#numOthers", 1);
      await waitForJson(pages, "#numItems", 0);

      for (let i = 0; i < 10; i++) {
        await page1.click("#push");
        await page2.click("#push");
      }

      await waitForJson(pages, "#numItems", 20);
      await waitUntilEqualOnAllPages(pages, "#items");

      for (let i = 0; i < 50; i++) {
        await page1.click(pickFrom(actions), { force: true });
        await page2.click(pickFrom(actions), { force: true });
        await nanoSleep();
      }

      await waitForJson(pages, "#syncStatus", "synchronized");
      await waitUntilEqualOnAllPages(pages, "#items");

      await page1.click("#clear");
      await waitForJson(pages, "#syncStatus", "synchronized");
      await waitForJson(pages, "#numItems", 0);
    };
  }

  test("fuzzy [push]", fuzzyTest(["#push"]));
  test("fuzzy [push, delete]", fuzzyTest(["#push", "#delete"]));

  test("fuzzy [push, undo]", fuzzyTest(["#push", "#undo"]));
  test("fuzzy [delete, undo]", fuzzyTest(["#delete", "#undo"]));
  test("fuzzy [push, undo, redo]", fuzzyTest(["#push", "#undo", "#redo"]));
  test("fuzzy [delete, undo, redo]", fuzzyTest(["#delete", "#undo", "#redo"]));

  test(
    "fuzzy [push, delete, undo, redo]",
    fuzzyTest(["#push", "#delete", "#undo", "#redo"])
  );
});
