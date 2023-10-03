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

const TEST_URL = "http://localhost:3007/redux";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete"]);
}

test.describe("Redux", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-redux-${testInfo.title.replaceAll(" ", "-")}`;
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

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  test.skip("fuzzy", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    const clicks = [];

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      clicks.push(pages[0].click("#push"));
      clicks.push(pages[1].click("#push"));
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 30; i++) {
      // no await to create randomness
      clicks.push(pages[0].click(pickRandomAction()));
      clicks.push(pages[1].click(pickRandomAction()));
      await sleep(50);
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });
});
