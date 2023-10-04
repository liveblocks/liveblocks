import { Page, test } from "@playwright/test";

import {
  expectJson,
  nanoSleep,
  pickFrom,
  preparePages,
  waitForContentToBeEquals,
  waitForJson,
} from "./utils";

const TEST_URL = "http://localhost:3007/redux";

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

  test("array push basic", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await expectJson(page1, "#itemsCount", 0);
    await waitForJson(pages, "#othersCount", 1);

    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 3);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
    await waitForJson(page2, "#theirPresence", { counter: 0 });
  });

  test("array push basic + presence", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await expectJson(page1, "#itemsCount", 0);
    await waitForJson(pages, "#othersCount", 1);

    await waitForJson(page2, "#theirPresence", { counter: 0 });

    await page1.click("#push");
    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await page1.click("#inc-counter");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await waitForJson(pages, "#itemsCount", 3);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
    await waitForJson(page2, "#theirPresence", { counter: 3, name: "Vincent" });
  });

  test("fuzzy (before others are visible)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
      await nanoSleep();
    }

    await waitForContentToBeEquals(pages, "#items");

    const actions = ["#push", "#delete"];
    for (let i = 0; i < 30; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  test("fuzzy (after others are visible)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#othersCount", 1);

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
      await nanoSleep();
    }

    await waitForContentToBeEquals(pages, "#items");

    const actions = ["#push", "#delete"];
    for (let i = 0; i < 30; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });
});
