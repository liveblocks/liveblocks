import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { genRoomId, preparePages, waitForJson } from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/storage/gates";

test.describe("Storage - Input/output Gates (single page)", () => {
  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    const pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}`,
      { n: 1 }
    );
    page = pages[0];
  });

  test.afterEach(() => page.close());

  test("test input/output gate blocking with a single client", async () => {
    await page.click("#disable-throttling");

    // Part I
    await page.click("#clear");
    await waitForJson(page, "#obj", {});

    // Clicking the buttons serially will cause the last one to win
    await page.click("#set-to-one");
    await page.click("#set-to-two");
    await page.click("#set-to-three");
    await waitForJson(page, "#obj", { a: 3 });

    // Part II
    await page.click("#clear");
    await waitForJson(page, "#obj", {});

    // Clicking the buttons serially will cause the last one to win, even if
    // the first write is slow
    await page.click("#slow");
    await new Promise<void>((res) => setTimeout(() => res(), 500));

    await page.click("#set-to-one"); // This will take longer in the server due to the "slow"
    await page.click("#set-to-two");
    await page.click("#set-to-three");
    await waitForJson(page, "#obj", { a: 3 });
  });
});

test.describe("Storage - Input/output Gates (multiple pages)", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("test input/output gate blocking with a single client", async () => {
    const [page1, page2] = pages;

    await page1.click("#disable-throttling");
    await page2.click("#disable-throttling");

    // Part I
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});

    // Clicking the buttons serially will cause the last one to win
    await page1.click("#set-to-one");
    await page2.click("#set-to-two");
    await page1.click("#set-to-three");
    await waitForJson(pages, "#obj", { a: 3 });

    // Part II
    await page1.click("#clear");
    await waitForJson(pages, "#obj", {});

    // Clicking the buttons serially will cause the last one to win, even if
    // the first write is slow
    await page1.click("#slow");
    await new Promise<void>((res) => setTimeout(() => res(), 500));

    await page1.click("#set-to-one"); // This will take longer in the server due to the "slow"
    await page2.click("#set-to-two");
    await page2.click("#set-to-three");
    await waitForJson(pages, "#obj", { a: 3 });
  });
});
