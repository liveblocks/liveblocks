import { Page, test } from "@playwright/test";

import {
  expectJson,
  pickFrom,
  preparePages,
  nanoSleep,
  waitForContentToBeEquals,
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
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#push");
    await waitForContentToBeEquals(pages, "#items");
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
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#set-name");
    await page1.click("#inc-counter");
    await waitForJson(page2, "#theirPresence", { name: "Vincent", counter: 1 });

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#inc-counter");
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#inc-counter");
    await waitForContentToBeEquals(pages, "#items");
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
    await waitForContentToBeEquals(pages, "#items");

    await page2.click("#leave");

    await page1.click("#push");

    await page2.click("#enter"); // Enter
    await waitForJson(page1, "#itemsCount", 3);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    const clicks = [];
    for (let i = 0; i < 10; i++) {
      clicks.push(page1.click("#push"));
      clicks.push(page2.click("#push"));
    }

    await Promise.all(clicks);
    await waitForJson(pages, "#itemsCount", 20);
    await waitForContentToBeEquals(pages, "#items");

    const actions = ["#push", "#delete", "#undo", "#redo"];
    for (let i = 0; i < 50; i++) {
      clicks.push(page1.click(pickFrom(actions)));
      clicks.push(page2.click(pickFrom(actions)));
      await nanoSleep();
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });
});
