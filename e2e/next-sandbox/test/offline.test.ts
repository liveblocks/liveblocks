import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  getJson,
  nanoSleep,
  pickFrom,
  preparePages,
  sleep,
  waitForContentToBeEquals,
  waitForJson,
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

  test.skip("one client offline with offline changes - connection issue (code 1005)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);

    await page1.click("#closeWebsocket");
    await sleep(50); // XXX Remove
    await page1.click("#push");
    await page2.click("#push");
    await expectJson(page1, "#itemsCount", 2);

    // XXX Really needed?
    const firstPageItems = (await getJson(page1, "#items")) as Json[];
    const secondPageItems = (await getJson(page2, "#items")) as Json[];

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await page1.click("#sendCloseEventConnectionError");
    await sleep(3000); // XXX Remove

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });

  test.skip("one client offline with offline changes - app server issue (code 4002)", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);

    await page1.click("#push");
    await waitForJson(pages, "#itemsCount", 1);

    const firstConnectionId = await getJson(page1, "#connectionId");

    await page1.click("#closeWebsocket");
    await sleep(50); // XXX Remove
    await page1.click("#push");
    await page2.click("#push");
    await expectJson(page1, "#itemsCount", 2);

    const firstPageItems = (await getJson(page1, "#items")) as Json[];
    const secondPageItems = (await getJson(page2, "#items")) as Json[];

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await page1.click("#sendCloseEventAppError");
    await sleep(5000); // XXX Remove

    await waitForContentToBeEquals(pages, "#items");

    const connectionIdAfterReconnect = await getJson(page1, "#connectionId");
    expect(connectionIdAfterReconnect).toEqual(firstConnectionId);

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
      await nanoSleep();
    }

    await Promise.all(clicks);
    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#closeWebsocket");
    await sleep(50); // XXX Remove

    const actions = ["#push", "#delete", "#move", "#undo", "#redo"];

    for (let i = 0; i < 50; i++) {
      clicks.push(page1.click(pickFrom(actions)));
      clicks.push(page2.click(pickFrom(actions)));
      await nanoSleep();
    }

    await sleep(2000); // XXX Remove

    await Promise.all(clicks);
    await page1.click("#sendCloseEventConnectionError");

    await sleep(3000); // XXX Remove

    await waitForContentToBeEquals(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#itemsCount", 0);
  });
});
