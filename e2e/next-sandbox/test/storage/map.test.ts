import { Page, test } from "@playwright/test";

import {
  delay,
  assertJsonContentAreEquals,
  pickRandomItem,
  pickNumberOfUnderRedo,
  preparePages,
  waitForContentToBeEquals,
  assertContainText,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#set", "#delete"]);
}

const TEST_URL = "http://localhost:3007/storage/map";

test.describe("Storage - LiveMap", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-map-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("fuzzy", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages[0].click(pickRandomAction());
      pages[1].click(pickRandomAction());
      await delay(50);
    }

    await waitForContentToBeEquals(pages);
  });

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  // See https://github.com/liveblocks/liveblocks/runs/8032018966?check_suite_focus=true#step:6:46
  test.skip("fuzzy with full undo/redo", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    await assertJsonContentAreEquals(pages);

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
