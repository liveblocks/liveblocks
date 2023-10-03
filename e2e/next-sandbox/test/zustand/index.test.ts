import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  getJson,
  pickRandomItem,
  preparePages,
  sleep,
  waitForContentToBeEquals,
  waitForJson,
} from "../utils";
import type { JsonObject } from "@liveblocks/client";

const TEST_URL = "http://localhost:3007/zustand";

function pickRandomActionWithUndoRedo() {
  return pickRandomItem(["#push", "#delete", "#undo", "#redo"]);
}

test.describe("Zustand", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-zustand-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(() => {
    return Promise.all(pages.map((page) => page.close()));
  });

  test.only("array push basic + presence", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(page1, "#itemsCount", 0);

    await waitForJson(pages, "#othersCount", 1);

    // XXX Use theirPresence here
    const othersFirstPage = (await getJson(page1, "#others")) as JsonObject[];
    const othersSecondPage = (await getJson(page2, "#others")) as JsonObject[];
    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  test("with enter and leave room", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await sleep(50);
    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page2.click("#leave"); // Leave
    await sleep(500);

    await page1.click("#push");
    await sleep(1000);

    await page2.click("#enter"); // Enter
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);
    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      page1.click("#push");
      page2.click("#push");
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      page1.click(pickRandomActionWithUndoRedo());
      page2.click(pickRandomActionWithUndoRedo());
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });
});
