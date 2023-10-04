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

const TEST_URL = "http://localhost:3007/storage/object";

test.describe("Storage - LiveObject", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-object-${testInfo.title.replaceAll(
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

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});

    for (let i = 0; i < 20; i++) {
      await page1.click("#set");
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#obj");

    for (let i = 0; i < 100; i++) {
      await page1.click(pickFrom(["#set", "#delete"]));
      await page2.click(pickFrom(["#set", "#delete"]));
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#obj");
  });

  test("fuzzy with nested objects", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});

    await expectJsonEqualOnAllPages(pages, "#obj");

    for (let i = 0; i < 20; i++) {
      await page1.click("#set-nested");
    }

    await waitUntilEqualOnAllPages(pages, "#obj");

    const actions = ["#set-nested", "#delete"];
    for (let i = 0; i < 50; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#obj");
  });

  test("fuzzy with nested objects and undo/redo", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});

    await expectJsonEqualOnAllPages(pages, "#obj");

    for (let i = 0; i < 20; i++) {
      await page1.click("#set-nested");
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#obj");

    const actions = ["#set-nested", "#delete"];
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
  });
});
