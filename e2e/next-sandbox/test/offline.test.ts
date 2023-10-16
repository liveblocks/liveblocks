import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  nanoSleep,
  pickFrom,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "./utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/offline/";

test.describe("Offline", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test('client remains connected if browser sends false-positive "offline" event (eg when connection still okay)', async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    await page1.click("#push");
    await waitForJson(pages, "#numItems", 1);

    // This button may cause the client to temporarily send a ping/pong to
    // check if the offline event is real or not. This should have no effect on
    // the messages sent here.
    await page1.click("#simulate-navigator-offline");
    await page1.click("#push");
    await page2.click("#push");
    await page2.click("#simulate-navigator-offline");
    await page1.click("#push");
    await page2.click("#push");

    await waitForJson(pages, "#numItems", 5);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });

  test("client synchronizes offline changes", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    await page1.click("#push");
    await waitForJson(pages, "#numItems", 1);

    // This button may cause the client to temporarily send a ping/pong to
    // check if the offline event is real or not. This should have no effect on
    // the messages sent here.
    await page1.click("#push");
    await page1.click("#disconnect");

    await page2.click("#push");
    await page2.click("#disconnect");

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#push");

    await page2.click("#push");
    await page2.click("#push");
    await page2.click("#push");
    await page2.click("#push");

    await page1.click("#connect");
    await page2.click("#reconnect");

    await waitForJson(pages, "#numItems", 10);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });

  test("temporary network loss", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    // Page 1 loses network connectivity
    await page1.context().setOffline(true);

    await page1.click("#push");
    await page1.click("#push");
    await page1.click("#push");
    await expectJson(page1, "#numItems", 3);

    await page2.click("#push");
    await page2.click("#push");
    await expectJson(page2, "#numItems", 2);

    // Wait until the client will start reconnecting officially
    await waitForJson(page1, "#socketStatus", "reconnecting");
    await waitForJson(pages, "#numOthers", 1); // Num others doesn't immediately drop!

    await page1.click("#push");
    await page1.click("#push");

    // Page 1 gets back online
    await page1.context().setOffline(false);
    await waitForJson(pages, "#socketStatus", "connected");

    await waitForJson(pages, "#numItems", 7);

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });

  test("permanent network loss", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");

    await page1.context().setOffline(true);
    await page2.context().setOffline(true);

    await waitForJson(pages, "#socketStatus", "reconnecting");

    await page1.context().setOffline(false);

    await waitForJson(page1, "#socketStatus", "connected");
    await waitForJson(page2, "#socketStatus", "reconnecting"); // Page 2 never connects
  });

  test("reconnect automatically (via unexpected condition)", async () => {
    const [page1] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#close-with-unexpected-condition");
    await expectJson(page1, "#socketStatus", "reconnecting");

    await page1.click("#push");
    await page1.click("#push");

    await waitForJson(page1, "#socketStatus", "connected");
    await waitForJson(pages, "#numItems", 3);
  });

  test("reconnect automatically (via abnormal reason)", async () => {
    const [page1] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#close-with-abnormal-reason");
    await expectJson(page1, "#socketStatus", "reconnecting");

    await page1.click("#push");
    await page1.click("#push");

    await waitForJson(page1, "#socketStatus", "connected");
    await waitForJson(pages, "#numItems", 3);
  });

  test("reconnect automatically (via token expired)", async () => {
    const [page1] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#close-with-token-expired");
    await expectJson(page1, "#socketStatus", "reconnecting");

    await page1.click("#push");
    await page1.click("#push");

    await waitForJson(page1, "#socketStatus", "connected");
    await waitForJson(pages, "#numItems", 3);
  });

  test("forced disconnect (via invalid message)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#send-invalid-data");
    await page1.click("#push");
    await page1.click("#push");
    await waitForJson(page1, "#socketStatus", "disconnected");

    // Client A will see the local push, but client B will never receive it
    await waitForJson(page1, "#numItems", 3);
    await waitForJson(page2, "#numItems", 1);

    // Sees client 1 disappear
    await waitForJson(page2, "#numOthers", 0);
  });

  test("forced disconnect (via not allowed)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#close-with-not-allowed");
    await page1.click("#push");
    await page1.click("#push");
    await waitForJson(page1, "#socketStatus", "disconnected");

    // Client A will see the local push, but client B will never receive it
    await waitForJson(page1, "#numItems", 3);
    await waitForJson(page2, "#numItems", 1);

    // Sees client 1 disappear
    await waitForJson(page2, "#numOthers", 0);
  });

  test("forced disconnect (via room full)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#close-with-room-full");
    await page1.click("#push");
    await page1.click("#push");
    await waitForJson(page1, "#socketStatus", "disconnected");

    // Client A will see the local push, but client B will never receive it
    await waitForJson(page1, "#numItems", 3);
    await waitForJson(page2, "#numItems", 1);

    // Sees client 1 disappear
    await waitForJson(page2, "#numOthers", 0);
  });

  test("forced disconnect (via explicit ask to not retry)", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#push");
    await page1.click("#close-with-dont-retry");
    await page1.click("#push");
    await page1.click("#push");
    await waitForJson(page1, "#socketStatus", "disconnected");

    // Client A will see the local push, but client B will never receive it
    await waitForJson(page1, "#numItems", 3);
    await waitForJson(page2, "#numItems", 1);

    // Sees client 1 disappear
    await waitForJson(page2, "#numOthers", 0);
  });

  test("fuzzy", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#socketStatus", "connected");
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
      await nanoSleep();
    }

    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#simulate-navigator-offline");

    const autoReconnectingActions = [
      "#simulate-navigator-offline",
      "#close-with-unexpected-condition",
      "#close-with-abnormal-reason",
      "#close-with-token-expired",
    ];

    const actions = ["#push", "#delete", "#move", "#undo", "#redo"];

    for (let i = 0; i < 50; i++) {
      await page1.click(pickFrom(actions));
      await page2.click(pickFrom(actions));
      await nanoSleep();

      if (i % 5 === 0) {
        await page1.click(pickFrom(autoReconnectingActions));
      }

      if (i % 5 === 2) {
        await page2.click(pickFrom(autoReconnectingActions));
      }
    }

    await waitForJson(pages, "#socketStatus", "connected");
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
  });
});
