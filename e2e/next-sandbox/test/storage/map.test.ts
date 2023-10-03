import { Page, test } from "@playwright/test";

import {
  assertJsonContentAreEquals,
  expectJson,
  pickNumberOfUndoRedo,
  pickRandomItem,
  preparePages,
  sleep,
  waitForContentToBeEquals,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#set", "#delete"]);
}

const TEST_URL = "http://localhost:3007/storage/map";

test.describe("Storage - LiveMap", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-map-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    // XXX Make JSON check
    // XXX Rename to mapSize
    await expectJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      page1.click(pickRandomAction());
      page2.click(pickRandomAction());
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");
  });

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  // See https://github.com/liveblocks/liveblocks/runs/8032018966?check_suite_focus=true#step:6:46
  test.skip("fuzzy with full undo/redo", async () => {
    const [page1, _page2] = pages;
    await page1.click("#clear");
    // XXX Make JSON check
    // XXX Rename to mapSize
    await expectJson(pages, "#itemsCount", 0);

    await assertJsonContentAreEquals(pages, "#items");

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
