import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  getJson,
  preparePages,
  waitForJson,
} from "./utils";

// NOTE: The tests below don't play well with concurrency just yet. The reason
// is that they unmount, remount, and then check that the connection ID
// increased by exactly one. This is not super robust. What matters is that the
// connection ID increased, but if it increased by more than 1, that could also
// be just fine. Better to express the conditional like that. For now, just not
// run them concurrently to avoid it.
// test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/multi/";

test.describe("Client logout", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}`,
      { n: 1, width: 1024 } // Open only a single, but wider, browser window
    );
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("client.logout() will reconnect currently connected rooms", async () => {
    const page = pages[0];

    await test.step("Setup three room connections", async () => {
      // Connect to two different rooms
      await page.click("#add-column");
      await page.click("#add-column");
      await page.fill("#input_1", "e2e:logout-A");
      await page.fill("#input_2", "e2e:logout-B");
      await page.fill("#input_3", "e2e:logout-B"); // Same room as instance 2
      await page.click("#mount_1");
      await page.click("#mount_2");
      await page.click("#mount_3");
    });

    let connId1: number, connId2: number, connId3: number;
    await test.step("Wait for all connections to be established", async () => {
      await waitForJson(page, "#socketStatus_1", "connected");
      await waitForJson(page, "#socketStatus_2", "connected");
      await waitForJson(page, "#socketStatus_3", "connected");
      connId1 = (await getJson(page, "#connectionId_1")) as number;
      connId2 = (await getJson(page, "#connectionId_2")) as number;
      connId3 = (await getJson(page, "#connectionId_3")) as number;
    });

    await test.step("Logout and verify reconnection", async () => {
      await page.click("#logout");
      await waitForJson(page, "#socketStatus_1", "connected");
      await waitForJson(page, "#socketStatus_2", "connected");
      await waitForJson(page, "#socketStatus_3", "connected");

      // All three rooms get re-connected (and thus increment their connection ID)
      await waitForJson(page, "#connectionId_1", connId1 + 1);
      await waitForJson(page, "#connectionId_2", connId2 + 1);
      await waitForJson(page, "#connectionId_3", connId3 + 1);
    });
  });

  test("client.logout() will not reconnect idle rooms", async () => {
    const page = pages[0];

    await test.step("Setup rooms with mixed connection states", async () => {
      // Connect to two different rooms
      await page.click("#add-column");
      await page.click("#add-column");
      await page.fill("#input_1", "e2e:logout-P");
      await page.fill("#input_2", "e2e:logout-Q");
      await page.fill("#input_3", "e2e:logout-R");
      await page.click("#mount_1");
      await page.click("#mount_2");
      await page.click("#disconnect_2"); // Immediately disconnect 2nd room
      await page.click("#mount_3");
    });

    let connId1: number, connId3: number;
    await test.step("Create idle rooms by disconnecting after connection", async () => {
      await waitForJson(page, "#socketStatus_1", "connected");
      await waitForJson(page, "#socketStatus_2", "initial");

      // Also disconnect room 3, but only after it has first established
      // a connection (so in contrast with room 2 it will have a connection ID)
      await waitForJson(page, "#socketStatus_3", "connected");
      await page.click("#disconnect_3");
      await waitForJson(page, "#socketStatus_3", "initial");

      connId1 = (await getJson(page, "#connectionId_1")) as number;
      await expectJson(page, "#connectionId_2", undefined); // Room 2 has no connection ID
      connId3 = (await getJson(page, "#connectionId_3")) as number;
    });

    await test.step("Verify logout only reconnects active rooms", async () => {
      await page.click("#logout");
      await waitForJson(page, "#socketStatus_1", "connected");
      await waitForJson(page, "#socketStatus_2", "initial"); // Remains in initial
      await waitForJson(page, "#socketStatus_3", "initial"); // Remains in initial

      // Only room 1 got reconnected (and increased its connection ID)
      await waitForJson(page, "#connectionId_1", connId1 + 1);
      await waitForJson(page, "#connectionId_2", undefined);
      await waitForJson(page, "#connectionId_3", connId3);
    });
  });
});
