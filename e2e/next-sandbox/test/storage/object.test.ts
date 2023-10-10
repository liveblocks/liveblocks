import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import type { IDSelector } from "../utils";
import {
  genRoomId,
  nanoSleep,
  pickFrom,
  pickNumberOfUndoRedo,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/storage/object";

test.describe("Storage - LiveObject", () => {
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
      await waitForJson(pages, "#obj", {});

      for (let i = 0; i < 20; i++) {
        await page1.click("#set");
      }
      await waitUntilEqualOnAllPages(pages, "#obj");

      for (let i = 0; i < 50; i++) {
        await page1.click(pickFrom(actions));
        await page2.click(pickFrom(actions));
        await nanoSleep();
      }

      await waitUntilEqualOnAllPages(pages, "#obj");

      // Clean up the room
      await page1.click("#clear");
      await waitForJson(pages, "#obj", {});
    };
  }

  test("fuzzy [set]", fuzzyTest(["#set"]));

  test("fuzzy [delete]", fuzzyTest(["#delete"]));

  test("fuzzy [set-nested, delete]", fuzzyTest(["#set-nested", "#delete"]));

  test("fuzzy [set, delete]", fuzzyTest(["#set", "#delete"]));

  test(
    "fuzzy [set, set-nested, delete]",
    fuzzyTest(["#set", "#set-nested", "#delete"])
  );

  test("fuzzy full w/ undo/redo", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});

    for (let i = 0; i < 20; i++) {
      await page1.click("#set-nested");
    }
    await waitUntilEqualOnAllPages(pages, "#obj");

    const actions = ["#set", "#set-nested", "#delete"];
    for (let i = 0; i < 50; i++) {
      const nbofUndoRedo = pickNumberOfUndoRedo();
      if (nbofUndoRedo > 0) {
        for (let y = 0; y < nbofUndoRedo; y++) {
          await page1.click("#undo");
        }
        for (let y = 0; y < nbofUndoRedo; y++) {
          await page1.click("#redo");
        }
      } else {
        await page1.click(pickFrom(actions));
        await page2.click(pickFrom(actions));
      }
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#obj");

    // Clean up the room
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});
  });
});
