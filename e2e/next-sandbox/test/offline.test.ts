import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  getJson,
  nanoSleep,
  pickFrom,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "./utils";
import type { Json } from "@liveblocks/client";

const TEST_URL = "http://localhost:3007/offline/";

test.describe("Offline", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-offline-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  // XXX Re-express this test!
  test.skip("one client offline with offline changes - connection issue (code 1005)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);

    await page1.click("#closeWebsocket");
    await nanoSleep(); // XXX Remove, wait on status change or similar, not a random amount of time

    await page1.click("#push");
    await page2.click("#push");

    await waitForJson(pages, "#itemsCount", 2);

    await page1.click("#sendCloseEventConnectionError");
    await nanoSleep(); // XXX Remove, wait on status change or similar, not a random amount of time

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  // XXX Re-express this test!
  test.skip("one client offline with offline changes - app server issue (code 4002)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);

    const firstConnectionId = await getJson(page1, "#connectionId");

    await page1.click("#closeWebsocket");
    await nanoSleep(); // XXX Remove, wait on status change or similar, not a random amount of time
    await page1.click("#push");
    await page2.click("#push");
    await expectJson(page1, "#itemsCount", 2);

    const firstPageItems = (await getJson(page1, "#items")) as Json[];
    const secondPageItems = (await getJson(page2, "#items")) as Json[];

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await page1.click("#sendCloseEventAppError");
    await nanoSleep(); // XXX Remove, wait on status change or similar, not a random amount of time

    await waitUntilEqualOnAllPages(pages, "#items");

    const connectionIdAfterReconnect = await getJson(page1, "#connectionId");
    expect(connectionIdAfterReconnect).toEqual(firstConnectionId);

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  // XXX Re-express this test!
  test.skip("fuzzy", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#closeWebsocket");
    await nanoSleep(); // XXX Remove, wait on status change or similar, not a random amount of time

    const actions = ["#push", "#delete", "#move", "#undo", "#redo"];

    for (let i = 0; i < 50; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();
    }

    await page1.click("#sendCloseEventConnectionError");
    await nanoSleep(); // XXX Remove, wait on status change or similar, not a random amount of time

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });
});
