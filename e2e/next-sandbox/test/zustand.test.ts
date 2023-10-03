import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  getJson,
  pickFrom,
  preparePages,
  nanoSleep,
  waitForContentToBeEquals,
  waitForJson,
} from "./utils";
import type { JsonObject } from "@liveblocks/client";

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

  test("array push basic + presence", async () => {
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
