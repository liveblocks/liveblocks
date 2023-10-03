import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  pickNumberOfUndoRedo,
  pickRandomItem,
  preparePages,
  sleep,
  waitForContentToBeEquals,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#set"]);
}

const TEST_URL = "http://localhost:3007/storage/with-suspense";

test.describe("Storage w/ Suspense", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-storage-with-suspense-${testInfo.title.replaceAll(
      " ",
      "-"
    )}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("list push basic", async () => {
    const [page1, _page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await expectJson(pages, "#itemsCount", 1);

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await expectJson(pages, "#itemsCount", 2);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await expectJson(pages, "#itemsCount", 3);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("list move", async () => {
    const [page1, _page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 5; i++) {
      await page1.click("#push");
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 10; i++) {
      await page1.click("#move");
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");
  });

  test("push conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      page1.click("#push");
      page2.click("#push");
      await sleep(50);
    }

    await expectJson(pages, "#itemsCount", 20);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("set conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 1; i++) {
      await page1.click("#push");
      await sleep(50);
    }

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      page1.click("#set");
      page2.click("#set");
      await sleep(50);
    }

    await expectJson(pages, "#itemsCount", 1);
    await waitForContentToBeEquals(pages, "#items");
  });

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  // See https://github.com/liveblocks/liveblocks/runs/8032018966?check_suite_focus=true#step:6:45
  test.skip("fuzzy with undo/redo push delete and move", async () => {
    const [page1, _page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    const numberOfItemsAtStart = 5;
    for (let i = 0; i < numberOfItemsAtStart; i++) {
      // no await to create randomness
      page1.click("#push");
      await sleep(50);
    }

    await expect(page1.locator("#itemsCount")).toContainText(
      numberOfItemsAtStart.toString()
    );

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages.forEach((page) => {
        const nbofUndoRedo = pickNumberOfUndoRedo();

        if (nbofUndoRedo > 0) {
          for (let y = 0; y < nbofUndoRedo; y++) {
            page.click("#undo");
          }
          for (let y = 0; y < nbofUndoRedo; y++) {
            page.click("#redo");
          }
        } else {
          page.click(pickRandomAction());
        }
      });

      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");
  });
});
