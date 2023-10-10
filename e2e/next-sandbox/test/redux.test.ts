import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  nanoSleep,
  pickFrom,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "./utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/redux";

test.describe("Redux", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("array push basic", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await expectJson(page1, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#numItems", 3);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(page2, "#theirPresence", { counter: 0 });
  });

  test("array push basic + presence", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await expectJson(page1, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await waitForJson(page2, "#theirPresence", { counter: 0 });

    await page1.click("#push");
    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await page1.click("#inc-counter");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await waitForJson(pages, "#numItems", 3);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(page2, "#theirPresence", { counter: 3, name: "Vincent" });
  });

  test("fuzzy (before others are visible)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    const actions = ["#push", "#delete"];
    for (let i = 0; i < 30; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });

  test("fuzzy (after others are visible)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    const actions = ["#push", "#delete"];
    for (let i = 0; i < 30; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });
});
