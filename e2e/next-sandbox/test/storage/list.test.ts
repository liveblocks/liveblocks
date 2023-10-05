import type { Page } from "@playwright/test";
import { test } from "@playwright/test";
import {
  expectJson,
  genRoomId,
  nanoSleep,
  pickFrom,
  pickNumberOfUndoRedo,
  preparePages,
  waitUntilEqualOnAllPages,
  waitForJson,
} from "../utils";

const TEST_URL = "http://localhost:3007/storage/list";

test.describe("Storage - LiveList", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("list push basic", async () => {
    const [page1] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 2);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 3);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  test("list move", async () => {
    const [page1, _page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 5; i++) {
      await page1.click("#push");
    }

    await expectJson(page1, "#itemsCount", 5);
    await waitUntilEqualOnAllPages(pages, "#items");

    for (let i = 0; i < 10; i++) {
      await page1.click("#move");
    }

    await expectJson(page1, "#itemsCount", 5);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  test("push conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
    }

    // await expectJson(pages, "#itemsCount", n => n >= 10 && n <= 20);
    await waitForJson(pages, "#itemsCount", 20);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  // XXX Actually fails sometimes, there definitely is a bug here
  test.skip("set conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);
    await waitUntilEqualOnAllPages(pages, "#items");

    for (let i = 0; i < 30; i++) {
      await page1.click("#set");
      await page2.click("#set");

      // In this test, we should never see a list of less than or more than
      // 1 element. When this happens, we'll want to immediately fail here.
      await expectJson(page1, "#itemsCount", 1);
      await expectJson(page2, "#itemsCount", 1);
    }

    await expectJson(page1, "#itemsCount", 1);
    await expectJson(page2, "#itemsCount", 1);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  // XXX Actually fails sometimes, there definitely is a bug here
  test.skip("fuzzy with undo/redo push delete and move", async () => {
    const [page1] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
    await waitUntilEqualOnAllPages(pages, "#items");

    const numberOfItemsAtStart = 5;
    for (let i = 0; i < numberOfItemsAtStart; i++) {
      await page1.click("#push");
    }

    await expectJson(page1, "#itemsCount", numberOfItemsAtStart);

    await waitUntilEqualOnAllPages(pages, "#items");

    const actions = ["#push", "#delete", "#move", "#set"];
    for (let i = 0; i < 50; i++) {
      for (const page of pages) {
        const nbofUndoRedo = pickNumberOfUndoRedo();
        if (nbofUndoRedo > 0) {
          for (let y = 0; y < nbofUndoRedo; y++) {
            await page.click("#undo");
          }
          for (let y = 0; y < nbofUndoRedo; y++) {
            await page.click("#redo");
          }
        } else {
          await page.click(pickFrom(actions));
        }

        // In this test, we should never see a list of more than 1 element. When
        // it happens, we'll want to immediately fail here.
        await expectJson(page, "#itemsCount", 1);
      }
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");
  });
});
