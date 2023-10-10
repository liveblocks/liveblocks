import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { randomInt } from "../utils";
import { genRoomId, preparePages, waitForJson } from "./utils";

// Don't run these in parallel, to not maximize load on servers
// test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/offline/";

// These load tests sometimes fail on CI, possibly because they're too
// resource-intensive for the limited GitHub Actions runners (too many tabs
// open, or too slow, hitting the timeout limit). So for now, we'll just skip
// them on CI, but still keep running them locally.
// eslint-disable-next-line @typescript-eslint/unbound-method
const skipOnCI = process.env.CI ? test.skip : test;

test.describe("Room completely full", () => {
  let pagesToClose: Page[];

  test.afterEach(() =>
    // Close all pages
    Promise.all(pagesToClose.map((page) => page.close()))
  );

  skipOnCI("join a room with 20 clients", async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    const url = `${TEST_URL}?room=${encodeURIComponent(room)}`;

    pagesToClose = [];
    const batches = [];

    // Open 4 batches...
    for (let i = 0; i < 4; i++) {
      const batch = await preparePages(url, 5); // ...of 5 windows each
      batches.push(batch);
      pagesToClose.push(...batch);
      await waitForJson(batch, "#socketStatus", "connected");
      await waitForJson(pagesToClose, "#numOthers", pagesToClose.length - 1);
    }

    // Close the first batch of 5 windows
    const batch = batches.pop()!;
    await Promise.all(batch.map((p) => p.close()));
    await waitForJson(batches.flat(), "#numOthers", batches.flat().length - 1);
  });

  skipOnCI(
    'join a room with 21 clients (will hit "room full")',
    async ({}, testInfo) => {
      const room = genRoomId(testInfo);
      const url = `${TEST_URL}?room=${encodeURIComponent(room)}`;

      pagesToClose = [];
      const batches = [];

      // Open 4 batches...
      for (let i = 0; i < 4; i++) {
        const batch = await preparePages(url, 5); // ...of 5 windows each
        batches.push(batch);
        pagesToClose.push(...batch);
        await waitForJson(batch, "#socketStatus", "connected");
        await waitForJson(pagesToClose, "#numOthers", pagesToClose.length - 1);
      }

      // Try to open one more... this will FAIL, because the room can hold max 20 connections
      const [lastPage] = await preparePages(url, 1);
      pagesToClose.push(lastPage);

      // The last client won't be able to join, because the room is full
      await waitForJson(lastPage, "#socketStatus", "disconnected");

      // But if another one disconnects, there is room to join again
      await pagesToClose[randomInt(pagesToClose.length - 1)].close();
      //                                               ^^^ Not the last client!
      await lastPage.click("#connect");
      await waitForJson(lastPage, "#socketStatus", "connected");
    }
  );
});
