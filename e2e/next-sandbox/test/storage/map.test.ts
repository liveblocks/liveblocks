import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import type { IDSelector } from "../utils";
import {
  expectJsonEqualOnAllPages,
  genRoomId,
  nanoSleep,
  pickFrom,
  pickNumberOfUndoRedo,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/storage/map";

test.describe("Storage - LiveMap", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  function fuzzyTest(actions: readonly IDSelector[]) {
    return async () => {
      const [page1, page2] = pages;
      await page1.click("#clear");

      await waitForJson(pages, "#mapSize", 0);

      for (let i = 0; i < 50; i++) {
        await page1.click(pickFrom(actions), { force: true });
        await page2.click(pickFrom(actions), { force: true });
        await nanoSleep();
      }

      await waitUntilEqualOnAllPages(pages, "#map");

      // Clean up the room after the test
      await page1.click("#clear");
      await waitForJson(pages, "#map", {});
    };
  }

  test("fuzzy [set]", fuzzyTest(["#set"]));

  test("fuzzy [set, delete]", fuzzyTest(["#set", "#set", "#set", "#delete"]));

  test(
    "fuzzy [set, delete, clear]",
    fuzzyTest([
      "#clear",
      "#delete",
      "#delete",
      "#delete",
      "#set",
      "#set",
      "#set",
      "#set",
      "#set",
      "#set",
    ])
  );

  test("fuzzy full w/ undo/redo", async () => {
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
            await page.click("#undo", { force: true });
          }
          for (let y = 0; y < nbofUndoRedo; y++) {
            await page.click("#redo", { force: true });
          }
        } else {
          await page.click(pickFrom(actions), { force: true });
        }
      }
      await nanoSleep();
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#map");

    // Clean up the room after the test
    await page1.click("#clear");
    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#map", {});
  });
});
