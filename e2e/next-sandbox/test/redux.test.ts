import { Page, test, expect } from "@playwright/test";

import {
  getJson,
  nanoSleep,
  pickRandomItem,
  preparePages,
  sleep,
  waitForContentToBeEquals,
  waitForJson,
} from "./utils";
import type { JsonObject } from "@liveblocks/client";

const TEST_URL = "http://localhost:3007/redux";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete"]);
}

test.describe("Redux", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-redux-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("array push basic + presence", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await sleep(3000); // XXX Remove
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

  test("fuzzy (before others are visible)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    const clicks = [];

    for (let i = 0; i < 10; i++) {
      clicks.push(page1.click("#push"));
      clicks.push(page2.click("#push"));
      await nanoSleep();
    }

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 30; i++) {
      clicks.push(page1.click(pickRandomAction()));
      clicks.push(page2.click(pickRandomAction()));
      await nanoSleep();
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  test("fuzzy (after others are visible)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#othersCount", 1);

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    const clicks = [];

    for (let i = 0; i < 10; i++) {
      clicks.push(page1.click("#push"));
      clicks.push(page2.click("#push"));
      await nanoSleep();
    }

    await waitForContentToBeEquals(pages, "#items");

    for (let i = 0; i < 30; i++) {
      clicks.push(page1.click(pickRandomAction()));
      clicks.push(page2.click(pickRandomAction()));
      await nanoSleep();
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });
});
