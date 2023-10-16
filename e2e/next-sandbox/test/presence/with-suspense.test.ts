import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  preparePage,
  preparePages,
  waitForJson,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const WIDTH = 640;
const BG_COLOR_1 = "&bg=" + encodeURIComponent("#cafbca");
const BG_COLOR_2 = "&bg=" + encodeURIComponent("#e9ddf9");

const TEST_URL = "http://localhost:3007/presence/with-suspense";

test.describe("Presence w/ Suspense", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("connect A => connect B => verify others on A and B", async () => {
    const [page1, page2] = pages;
    await waitForJson(pages, "#numOthers", 1);
    await waitForJson(pages, "#theirPresence", {});

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => update presence A => verify presence A on B", async () => {
    const [page1, page2] = pages;
    await waitForJson([page1, page2], "#numOthers", 1);

    await page1.click("#inc-foo");
    await page1.click("#inc-foo");
    await expectJson(page1, "#myPresence", { foo: 2 });
    await waitForJson(page2, "#theirPresence", { foo: 2 });

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => update presence B => verify presence A on B", async () => {
    const [page1, page2] = pages;
    await waitForJson([page1, page2], "#numOthers", 1);

    await page2.click("#inc-foo");
    await page2.click("#inc-foo");
    await page2.click("#inc-foo");
    await expectJson(page2, "#myPresence", { foo: 3 });
    await waitForJson(page1, "#theirPresence", { foo: 3 });

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => verify other on B => disconnect A => verify others is empty on B", async () => {
    const [page1, page2] = pages;
    await waitForJson([page1, page2], "#numOthers", 1);

    await waitForJson(page2, "#theirPresence", {});

    await page1.close();

    await waitForJson(page2, "#numOthers", 0);

    await page2.close();
  });

  test("client B receives other update presence before initial presence", async () => {
    const [page1, page2] = pages;
    await waitForJson([page1, page2], "#numOthers", 1);

    await page1.click("#set-bar");
    await page1.click("#set-qux");

    for (let i = 0; i < 5; i++) {
      await page2.click("#leave-room");
      await page2.click("#enter-room");

      await page1.click("#set-bar");

      await waitForJson(page2, "#numOthers", 1);
      await expectJson(page2, "#theirPresence", {
        bar: "hey",
        qux: 1337,
      });
    }

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => broadcast from A => verify B got event", async () => {
    const [page1, page2] = pages;
    await waitForJson(page1, "#numOthers", 1);

    await page1.click("#broadcast-emoji");

    // Now check contents of page
    await expectJson(page1, "#events", []);
    await waitForJson(page2, "#events", [{ type: "EMOJI", emoji: "🔥" }]);

    await page2.click("#broadcast-number");
    await page2.click("#broadcast-emoji");
    await page2.click("#broadcast-number");

    // Check again
    await waitForJson(page1, "#events", [
      42,
      { type: "EMOJI", emoji: "🔥" },
      42,
    ]);
    await waitForJson(page2, "#events", [{ type: "EMOJI", emoji: "🔥" }]);

    await page1.close();
    await page2.close();
  });
});

test.describe("Presence w/ Suspense + specific window timing", () => {
  test("connect A => update presence A => connect B => verify presence A on B", async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    const url = `${TEST_URL}?room=${encodeURIComponent(room)}`;

    const page1 = await preparePage(url + BG_COLOR_1);
    await page1.click("#inc-foo");

    const page2 = await preparePage(url + BG_COLOR_2, WIDTH);
    await waitForJson([page1, page2], "#numOthers", 1);

    await expectJson(page2, "#theirPresence", { foo: 1 });

    await page1.close();
    await page2.close();
  });
});
