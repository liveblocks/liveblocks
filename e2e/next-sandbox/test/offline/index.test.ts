import { Page, test, expect } from "@playwright/test";

import {
  expectJson,
  getJson,
  pickRandomItem,
  preparePages,
  sleep,
  waitForContentToBeEquals,
} from "../utils";
import type { Json } from "@liveblocks/client";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#undo", "#redo"]);
}

const TEST_URL = "http://localhost:3007/offline/";

test.describe("Offline", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-offline-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test.skip("one client offline with offline changes - connection issue (code 1005)", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await pages[0].click("#push");
    await expectJson(pages, "#itemsCount", 1);

    await pages[0].click("#closeWebsocket");
    await sleep(50);
    await pages[0].click("#push");
    await pages[1].click("#push");
    await expectJson(pages[0], "#itemsCount", 2);

    // XXX Really needed?
    const firstPageItems = (await getJson(pages[0], "#items")) as Json[];
    const secondPageItems = (await getJson(pages[1], "#items")) as Json[];

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await pages[0].click("#sendCloseEventConnectionError");
    await sleep(3000);

    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });

  test.skip("one client offline with offline changes - app server issue (code 4002)", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    await pages[0].click("#push");
    await expectJson(pages, "#itemsCount", 1);

    const firstConnectionId = await getJson(pages[0], "#connectionId");

    await pages[0].click("#closeWebsocket");
    await sleep(50);
    await pages[0].click("#push");
    await pages[1].click("#push");
    await expectJson(pages[0], "#itemsCount", 2);

    const firstPageItems = (await getJson(pages[0], "#items")) as Json[];
    const secondPageItems = (await getJson(pages[1], "#items")) as Json[];

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await pages[0].click("#sendCloseEventAppError");
    await sleep(5000);

    await waitForContentToBeEquals(pages, "#items");

    const connectionIdAfterReconnect = await getJson(pages[0], "#connectionId");
    expect(connectionIdAfterReconnect).toEqual(firstConnectionId);

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });

  test.skip("fuzzy", async () => {
    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      pages[0].click("#push");
      pages[1].click("#push");
      await sleep(50);
    }

    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#closeWebsocket");
    await sleep(50);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages[0].click(pickRandomAction());
      pages[1].click(pickRandomAction());
      await sleep(50);
    }

    await sleep(2000);

    await pages[0].click("#sendCloseEventConnectionError");

    await sleep(3000);

    await waitForContentToBeEquals(pages, "#items");

    await pages[0].click("#clear");
    await expectJson(pages, "#itemsCount", 0);
  });
});
