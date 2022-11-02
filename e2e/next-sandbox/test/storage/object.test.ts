import { Page, test } from "@playwright/test";

import {
  delay,
  assertJsonContentAreEquals,
  pickRandomItem,
  waitForContentToBeEquals,
  pickNumberOfUnderRedo,
  preparePages,
  assertContainText,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#set", "#delete"]);
}

function pickRandomActionNested() {
  return pickRandomItem(["#set-nested", "#delete"]);
}

const TEST_URL = "http://localhost:3007/storage/object";

test.describe("Storage - LiveObject", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-object-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("fuzzy", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "{}", "items");

    for (let i = 0; i < 20; i++) {
      pages[0].click("#set");
      await delay(50);
    }

    await waitForContentToBeEquals(pages);

    for (let i = 0; i < 100; i++) {
      // no await to create randomness
      pages[0].click(pickRandomAction());
      pages[1].click(pickRandomAction());
      await delay(50);
    }

    await waitForContentToBeEquals(pages);
  });

  test("fuzzy with nested objects", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "{}", "items");

    await assertJsonContentAreEquals(pages);

    for (let i = 0; i < 20; i++) {
      pages[0].click("#set-nested");
      await delay(50);
    }

    await waitForContentToBeEquals(pages);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages[0].click(pickRandomActionNested());
      pages[1].click(pickRandomActionNested());
      await delay(50);
    }

    await waitForContentToBeEquals(pages);
  });

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  // See https://github.com/liveblocks/liveblocks/runs/8032018966?check_suite_focus=true#step:6:47
  test.skip("fuzzy with nested objects and undo/redo", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "{}", "items");

    await assertJsonContentAreEquals(pages);

    for (let i = 0; i < 20; i++) {
      pages[0].click("#set-nested");
      await delay(50);
    }

    await waitForContentToBeEquals(pages);

    for (let i = 0; i < 50; i++) {
      const nbofUndoRedo = pickNumberOfUnderRedo();

      if (nbofUndoRedo > 0) {
        for (let y = 0; y < nbofUndoRedo; y++) {
          pages[0].click("#undo");
        }
        for (let y = 0; y < nbofUndoRedo; y++) {
          pages[0].click("#redo");
        }
      } else {
        pages[0].click(pickRandomActionNested());
        pages[1].click(pickRandomActionNested());
      }

      await delay(50);
    }

    await waitForContentToBeEquals(pages);
  });
});
