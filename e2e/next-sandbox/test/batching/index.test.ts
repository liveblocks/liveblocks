import { test, Page } from "@playwright/test";
import {
  expectJson,
  preparePages,
  waitForContentToBeEquals,
  waitForJson,
} from "../utils";

const TEST_URL = "http://localhost:3007/batching";

test.describe("Storage - Batching", () => {
  let pages: [Page, Page];

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
    const [page1, page2] = pages;

    await page1.click("#clear");
    await expectJson(page1, "#itemsCount", 0);

    await page1.click("#update-storage-presence-batch");
    await expectJson(page1, "#itemsCount", 1);

    await waitForContentToBeEquals(pages, "#items");

    await expectJson(page1, "#theirPresence", {});
    await expectJson(page2, "#theirPresence", { count: 1 });

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  // TODO Add tests using the undo/redo buttons
});
