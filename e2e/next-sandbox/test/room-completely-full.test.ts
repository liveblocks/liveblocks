import type { Page } from "@playwright/test";
import { test } from "@playwright/test";
import { genRoomId, preparePages, waitForJson } from "./utils";
import { randomInt } from "../utils";

const TEST_URL = "http://localhost:3007/offline/";

test.describe("Room completely full", () => {
  let pages: Page[];

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("join a room with 20 clients", async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}`,
      20
    );

    await waitForJson(pages, "#socketStatus", "connected");
    await waitForJson(pages, "#numOthers", 19);
  });

  test('join a room with 21 clients (will hit "room full")', async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    const url = `${TEST_URL}?room=${encodeURIComponent(room)}`;

    // Open the first 20 connections
    pages = await preparePages(url, 20);
    await waitForJson(pages, "#socketStatus", "connected");
    await waitForJson(pages, "#numOthers", 19);

    // Try to open 2 more
    const [lastPage] = await preparePages(url, 1);
    pages.push(lastPage);

    // The last client won't be able to join, because the room is full
    await waitForJson(lastPage, "#socketStatus", "disconnected");

    // But if another one disconnects, there is room to join again
    await pages[randomInt(pages.length - 1)].close();
    //                                 ^^^ Not the last client!
    await lastPage.click("#connect");
    await waitForJson(lastPage, "#socketStatus", "connected");
  });
});
