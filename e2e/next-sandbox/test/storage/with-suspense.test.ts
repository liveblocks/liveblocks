import { Page, test } from "@playwright/test";

import {
  expectJson,
  pickNumberOfUndoRedo,
  pickRandomItem,
  preparePages,
  waitForContentToBeEquals,
  waitForJson,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#set"]);
}

const TEST_URL = "http://localhost:3007/storage/with-suspense";

test.describe("Storage w/ Suspense", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-storage-with-suspense-${testInfo.title.replaceAll(
      /[^\w\d_-]+/g,
      "-"
    )}`;
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(roomName)}`
    );
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

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 2);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 3);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("list move", async () => {
    const [page1] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 5; i++) {
      await page1.click("#push");
    }

    await expectJson(page1, "#itemsCount", 5);
    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 10; i++) {
      await page1.click("#move");
    }

    await expectJson(page1, "#itemsCount", 5);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("push conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    const clicks = [];
    for (let i = 0; i < 10; i++) {
      clicks.push(page1.click("#push"));
      clicks.push(page2.click("#push"));
    }

    await Promise.all(clicks);
    // await expectJson(pages, "#itemsCount", n => n >= 10 && n <= 20);
    await waitForJson(pages, "#itemsCount", 20);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("set conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);

    const clicks = [];
    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      clicks.push(page1.click("#set"));
      clicks.push(page2.click("#set"));
    }

    await Promise.all(clicks);

    await waitForJson(pages, "#itemsCount", 1);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("fuzzy with undo/redo push delete and move", async () => {
    const [page1] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    const numberOfItemsAtStart = 5;
    const clicks = [];
    for (let i = 0; i < numberOfItemsAtStart; i++) {
      clicks.push(page1.click("#push"));
    }

    await Promise.all(clicks);
    await expectJson(page1, "#itemsCount", numberOfItemsAtStart);

    await waitForContentToBeEquals(pages, "#items");

    clicks.length = 0;
    for (let i = 0; i < 50; i++) {
      pages.forEach((page) => {
        const nbofUndoRedo = pickNumberOfUndoRedo();
        if (nbofUndoRedo > 0) {
          for (let y = 0; y < nbofUndoRedo; y++) {
            clicks.push(page.click("#undo"));
          }
          for (let y = 0; y < nbofUndoRedo; y++) {
            clicks.push(page.click("#redo"));
          }
        } else {
          clicks.push(page.click(pickRandomAction()));
        }
      });
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");
  });
});
