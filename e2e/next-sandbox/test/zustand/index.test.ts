import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  getJson,
  pickRandomItem,
  preparePages,
  sleep,
  waitForContentToBeEquals,
} from "../utils";
import type { JsonObject } from "@liveblocks/client";

const TEST_URL = "http://localhost:3007/zustand";

function pickRandomActionWithUndoRedo() {
  return pickRandomItem(["#push", "#delete", "#undo", "#redo"]);
}

test.describe("Zustand", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-zustand-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("array push basic + presence", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await sleep(3000);
    const othersFirstPage = (await getJson(
      pages[0],
      "#others"
    )) as JsonObject[];
    const othersSecondPage = (await getJson(
      pages[1],
      "#others"
    )) as JsonObject[];

    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await pages[0].click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });

  test("with enter and leave room", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await pages[0].click("#push");
    await sleep(50);
    await pages[0].click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await pages[1].click("#leave"); // Leave
    await sleep(500);

    await pages[0].click("#push");
    await sleep(1000);

    await pages[1].click("#enter"); // Enter
    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });

  test.skip("fuzzy", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      pages[0].click("#push");
      pages[1].click("#push");
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages[0].click(pickRandomActionWithUndoRedo());
      pages[1].click(pickRandomActionWithUndoRedo());
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });
});
