import { Page, test } from "@playwright/test";

import {
  expectJsonEqualOnAllPages,
  nanoSleep,
  pickNumberOfUndoRedo,
  pickFrom,
  preparePages,
  waitUntilEqualOnAllPages,
  waitForJson,
} from "../utils";

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

  // XXX Actually fails sometimes, there definitely is a bug here
  test.skip("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");

    await waitForJson(pages, "#mapSize", 0);

    const actions = ["#set", "#delete"];
    for (let i = 0; i < 50; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#map");
  });

  test.skip("fuzzy with full undo-redo", async () => {
    const [page1] = pages;
    await page1.click("#clear");

    await waitForJson(pages, "#mapSize", 0);
    await expectJsonEqualOnAllPages(pages, "#map");

    const actions = ["#set", "#delete"];
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
      }
      await nanoSleep();
    }

    // TODO Investigate: sometimes these don't converge to the same value
    await waitUntilEqualOnAllPages(pages, "#map");
  });
});
