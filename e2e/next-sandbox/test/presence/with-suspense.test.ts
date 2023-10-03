import { test } from "@playwright/test";
import { expectJson, preparePage, waitForJson } from "../utils";

const WIDTH = 640;
const BG_COLOR_1 = "&bg=" + encodeURIComponent("#cafbca");
const BG_COLOR_2 = "&bg=" + encodeURIComponent("#e9ddf9");

const TEST_URL = "http://localhost:3007/presence/with-suspense";

// XXX DRY up page prep + close in a before/after test

test.describe("Presence w/ Suspense", () => {
  test("connect A => connect B => verify others on A and B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario1";
    const pages = await Promise.all([
      preparePage(testUrl + BG_COLOR_1),
      preparePage(testUrl + BG_COLOR_2, WIDTH),
    ]);
    const [page1, page2] = pages;

    await waitForJson(pages, "#othersCount", 1);

    await expectJson(pages, "#theirPresence", {});

    await page1.close();
    await page2.close();
  });

  test("connect A => update presence A => connect B => verify presence A on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario2";
    const page1 = await preparePage(testUrl + BG_COLOR_1);
    await page1.click("#increment-button");

    const page2 = await preparePage(testUrl + BG_COLOR_2, WIDTH);
    await waitForJson([page1, page2], "#othersCount", 1);

    await expectJson(page2, "#theirPresence", { count: 1 });

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => update presence A => verify presence A on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario3";
    const [page1, page2] = await Promise.all([
      preparePage(testUrl + BG_COLOR_1),
      preparePage(testUrl + BG_COLOR_2, WIDTH),
    ]);

    await waitForJson([page1, page2], "#othersCount", 1);

    await page1.click("#increment-button");
    await expectJson(page1, "#myPresence", { count: 1 });
    await waitForJson(page2, "#theirPresence", { count: 1 });

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => update presence B => verify presence A on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario3";
    const [page1, page2] = await Promise.all([
      preparePage(testUrl + BG_COLOR_1),
      preparePage(testUrl + BG_COLOR_2, WIDTH),
    ]);

    await waitForJson([page1, page2], "#othersCount", 1);

    await page2.click("#increment-button");
    await expectJson(page2, "#myPresence", { count: 1 });
    await waitForJson(page1, "#theirPresence", { count: 1 });

    await page1.close();
    await page2.close();
  });

  test("connect A => connect B => verify other on B => disconnect A => verify others is empty on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario4";
    const [page1, page2] = await Promise.all([
      preparePage(testUrl + BG_COLOR_1),
      preparePage(testUrl + BG_COLOR_2, WIDTH),
    ]);

    await waitForJson([page1, page2], "#othersCount", 1);

    await waitForJson(page2, "#theirPresence", {});

    await page1.close();

    await waitForJson(page2, "#othersCount", 0);

    await page2.close();
  });

  test("client B receives other update presence before initial presence", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario5";
    const [page1, page2] = await Promise.all([
      preparePage(testUrl + BG_COLOR_1),
      preparePage(testUrl + BG_COLOR_2, WIDTH),
    ]);

    await waitForJson([page1, page2], "#othersCount", 1);

    await page1.click("#set-second-prop");
    await page1.click("#set-third-prop");

    for (let i = 0; i < 5; i++) {
      await page2.click("#leave-room");
      await page2.click("#enter-room");

      await page1.click("#set-second-prop");

      await waitForJson(page2, "#othersCount", 1);
      await expectJson(page2, "#theirPresence", {
        secondProp: 1,
        thirdProp: 1,
      });
    }

    await page1.close();
    await page2.close();
  });
});

test.describe("Broadcast w/ Suspense", () => {
  test("connect A => connect B => broadcast from A => verify B got event", async () => {
    const testUrl = TEST_URL + "?room=e2e-broadcast-with-suspense-scenario1";
    const [page1, page2] = await Promise.all([
      preparePage(testUrl + BG_COLOR_1),
      preparePage(testUrl + BG_COLOR_2, WIDTH),
    ]);

    await waitForJson(page1, "#othersCount", 1);

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
