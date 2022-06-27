import { Page, test, expect } from "@playwright/test";

import {
  delay,
  assertContainText,
  pickRandomItem,
  pickNumberOfUnderRedo,
  waitForContentToBeEquals,
  preparePages,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#set"]);
}

const TEST_URL = "http://localhost:3007/storage/list";

test.describe("Storage - LiveList", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-list-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("list push basic", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    await pages[0].click("#push");
    await assertContainText(pages, "1");

    await waitForContentToBeEquals(pages);

    await pages[0].click("#push");
    await assertContainText(pages, "2");
    await waitForContentToBeEquals(pages);

    await pages[0].click("#push");
    await assertContainText(pages, "3");
    await waitForContentToBeEquals(pages);
  });

  test("list move", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    for (let i = 0; i < 5; i++) {
      await pages[0].click("#push");
      await delay(50);
    }

    await waitForContentToBeEquals(pages);

    for (let i = 0; i < 10; i++) {
      await pages[0].click("#move");
      await delay(50);
    }

    await waitForContentToBeEquals(pages);
  });

  test("push conflicts", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      pages[0].click("#push");
      pages[1].click("#push");
      await delay(50);
    }

    await assertContainText(pages, "20");
    await waitForContentToBeEquals(pages);
  });

  test("set conflicts", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    for (let i = 0; i < 1; i++) {
      await pages[0].click("#push");
      await delay(50);
    }

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      pages[0].click("#set");
      pages[1].click("#set");
      await delay(50);
    }

    await assertContainText(pages, "1");
    await waitForContentToBeEquals(pages);
  });

  test("fuzzy with undo/redo push delete and move", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    const numberOfItemsAtStart = 5;
    for (let i = 0; i < numberOfItemsAtStart; i++) {
      // no await to create randomness
      pages[0].click("#push");
      await delay(50);
    }

    await expect(pages[0].locator("#itemsCount")).toContainText(
      numberOfItemsAtStart.toString()
    );

    await waitForContentToBeEquals(pages);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages.forEach((page) => {
        const nbofUndoRedo = pickNumberOfUnderRedo();

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

      await delay(50);
    }

    await waitForContentToBeEquals(pages);
  });
});
