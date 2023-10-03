import { test, expect, Page } from "@playwright/test";
import {
  expectJson,
  getJson,
  preparePages,
  waitForContentToBeEquals,
} from "../utils";
import type { JsonObject } from "@liveblocks/client";

const TEST_URL = "http://localhost:3007/batching";

test.describe("Storage - Batching", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-batching-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("update storage and presence", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await pages[0].click("#update-storage-presence-batch");
    await expectJson(pages, "#itemsCount", 1);

    await waitForContentToBeEquals(pages, "#items");
    const othersFirstPage = (await getJson(
      pages[0],
      "#others"
    )) as JsonObject[];
    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});

    const othersSecondPage = (await getJson(pages[1], "#others")) as any[];
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence.count).toEqual(1);

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });
});
