import { Page, test } from "@playwright/test";

import {
  assertJsonContentAreEquals,
  nanoSleep,
  pickNumberOfUndoRedo,
  pickFrom,
  preparePages,
  waitForContentToBeEquals,
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

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");

    await waitForJson(pages, "#mapSize", 0);

    const actions = ["#set", "#delete"];
    const clicks = [];
    for (let i = 0; i < 50; i++) {
      clicks.push(page1.click(pickFrom(actions)));
      clicks.push(page2.click(pickFrom(actions)));
      await nanoSleep();
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#map");
  });

  test.skip("fuzzy with full undo-redo", async () => {
    const [page1] = pages;
    await page1.click("#clear");

    await waitForJson(pages, "#mapSize", 0);

    await assertJsonContentAreEquals(pages, "#map");

    const actions = ["#set", "#delete"];
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
          clicks.push(page.click(pickFrom(actions)));
        }
      });
      await nanoSleep();
    }

    // TODO Investigate: sometimes these don't converge to the same value
    await waitForContentToBeEquals(pages, "#map");
  });
});
