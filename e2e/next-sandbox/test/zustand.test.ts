import { Page, test } from "@playwright/test";

import {
  expectJson,
  pickFrom,
  preparePages,
  nanoSleep,
  waitUntilEqualOnAllPages,
  waitForJson,
} from "./utils";

const TEST_URL = "http://localhost:3007/zustand";

test.describe("Zustand", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-zustand-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("array push basic", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(page1, "#itemsCount", 0);

    await waitForJson(pages, "#othersCount", 1);

    await page1.click("#push");
    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");
    await expectJson(page2, "#itemsCount", 7);

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  test("array push basic + presence", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await expectJson(page1, "#itemsCount", 0);

    await waitForJson(pages, "#othersCount", 1);

    await page1.click("#push");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await waitForJson(page2, "#theirPresence", { name: "Vincent", counter: 1 });

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#inc-counter");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#inc-counter");
    await waitUntilEqualOnAllPages(pages, "#items");
    await expectJson(page2, "#itemsCount", 5);

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
    await waitForJson(page2, "#theirPresence", { name: "Vincent", counter: 3 });
  });

  test("with enter and leave room", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await page1.click("#push");
    await expectJson(page1, "#itemsCount", 2);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page2.click("#leave");

    await page1.click("#push");

    await page2.click("#enter"); // Enter
    await waitForJson(page1, "#itemsCount", 3);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  // XXX Actually fails sometimes, there definitely is a bug here
  test.skip("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
    }

    await waitForJson(pages, "#itemsCount", 20);
    await waitUntilEqualOnAllPages(pages, "#items");

    const actions = ["#push", "#delete", "#undo", "#redo"];
    for (let i = 0; i < 50; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });
});
