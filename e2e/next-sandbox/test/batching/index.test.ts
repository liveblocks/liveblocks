import { test, expect, Page } from "@playwright/test";
import {
  waitForContentToBeEquals,
  preparePages,
  assertContainText,
  getJsonContent,
} from "../utils";

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
    await assertContainText(pages, "0");

    await pages[0].click("#update-storage-presence-batch");
    await assertContainText(pages, "1");

    await waitForContentToBeEquals(pages);
    const othersFirstPage = await getJsonContent(pages[0], "others");
    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});

    const othersSecondPage = await getJsonContent(pages[1], "others");
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence.count).toEqual(1);

    await pages[0].click("#clear");
    await assertContainText(pages, "0");
  });
});
