import { Page, test } from "@playwright/test";

import {
  assertJsonContentAreEquals,
  pickNumberOfUndoRedo,
  pickRandomItem,
  preparePages,
  waitForContentToBeEquals,
  waitForJson,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#set", "#delete"]);
}

const TEST_URL = "http://localhost:3007/storage/map";

test.describe("Storage - LiveMap", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-map-${testInfo.title.replaceAll(/[^\w\d]+/g, "-")}`;
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(roomName)}`
    );
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");

    // XXX Rename to mapSize
    await waitForJson(pages, "#itemsCount", 0);

    const clicks = [];
    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      clicks.push(page1.click(pickRandomAction()));
      clicks.push(page2.click(pickRandomAction()));
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");
  });

  test("fuzzy with full undo-redo", async () => {
    const [page1] = pages;
    await page1.click("#clear");

    // XXX Rename to mapSize
    await waitForJson(pages, "#itemsCount", 0);

    await assertJsonContentAreEquals(pages, "#items");

    const clicks: unknown[] = [];
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
