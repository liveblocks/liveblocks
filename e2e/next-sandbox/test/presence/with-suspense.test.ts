import type { Json, JsonObject } from "@liveblocks/client";
import { Page, test, expect } from "@playwright/test";
import {
  preparePage,
  delay,
  getJsonContent,
  waitForTextContent,
  // getTextContent,
  // preparePages,
  assertContainText,
} from "../utils";

function getOthers(page: Page): Promise<JsonObject[]> {
  return getJsonContent(page, "#others") as Promise<JsonObject[]>;
}

function getEvents(page: Page): Promise<Json[]> {
  return getJsonContent(page, "#events") as Promise<Json[]>;
}

const WIDTH = 640;
const BG_COLOR_1 = "&bg=" + encodeURIComponent("#cafbca");
const BG_COLOR_2 = "&bg=" + encodeURIComponent("#e9ddf9");

const TEST_URL = "http://localhost:3007/presence/with-suspense";

test.describe("Presence w/ Suspense", () => {
  test("connect A => connect B => verify others on A and B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario1";
    const firstPage = await preparePage(testUrl + BG_COLOR_1);
    const secondPage = await preparePage(testUrl + BG_COLOR_2, WIDTH);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "#othersCount", "1");

    const othersFirstPage = await getOthers(firstPage);
    const othersSecondPage = await getOthers(secondPage);

    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await firstPage.close();
    await secondPage.close();
  });

  test("connect A => update presence A => connect B => verify presence A on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario2";
    const firstPage = await preparePage(testUrl + BG_COLOR_1);
    await firstPage.click("#increment-button");

    const secondPage = await preparePage(testUrl + BG_COLOR_2, WIDTH);

    await assertContainText([firstPage, secondPage], "#othersCount", "1");

    const othersSecondPage = await getOthers(secondPage);

    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({ count: 1 });

    await firstPage.close();
    await secondPage.close();
  });

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  test.skip("connect A => connect B => update presence A => verify presence A on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario3";
    const firstPage = await preparePage(testUrl + BG_COLOR_1);
    const secondPage = await preparePage(testUrl + BG_COLOR_2, WIDTH);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "#othersCount", "1");

    await firstPage.click("#increment-button");

    await delay(100);

    const othersSecondPage = await getOthers(secondPage);

    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({ count: 1 }); // This line regularly fails when running tests -- figure out what's up here

    await firstPage.close();
    await secondPage.close();
  });

  test("connect A => connect B => verify other on B => disconnect A => verify others is empty on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario4";
    const firstPage = await preparePage(testUrl + BG_COLOR_1);
    const secondPage = await preparePage(testUrl + BG_COLOR_2, WIDTH);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "#othersCount", "1");

    let othersSecondPage = await getOthers(secondPage);
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await firstPage.close();

    await delay(300);

    othersSecondPage = await getOthers(secondPage);
    expect(othersSecondPage.length).toEqual(0);

    await secondPage.close();
  });

  test("client B receives other update presence before initial presence", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-with-suspense-scenario5";
    const firstPage = await preparePage(testUrl + BG_COLOR_1);
    const secondPage = await preparePage(testUrl + BG_COLOR_2, WIDTH);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "#othersCount", "1");

    await firstPage.click("#set-second-prop");
    await firstPage.click("#set-third-prop");

    await delay(1000);

    for (let i = 0; i < 5; i++) {
      await secondPage.click("#leave-room");

      await secondPage.click("#enter-room");
      await delay(500);
      await firstPage.click("#set-second-prop");

      await assertContainText([secondPage], "#othersCount", "1");

      let othersSecondPage = await getOthers(secondPage);
      expect(othersSecondPage[0].presence).toEqual({
        secondProp: 1,
        thirdProp: 1,
      });

      await delay(1000);
    }

    await firstPage.close();
    await secondPage.close();
  });
});

test.describe("Broadcast w/ Suspense", () => {
  test("connect A => connect B => broadcast from A => verify B got event", async () => {
    const testUrl = TEST_URL + "?room=e2e-broadcast-with-suspense-scenario1";
    const firstPage = await preparePage(testUrl + BG_COLOR_1);
    const secondPage = await preparePage(testUrl + BG_COLOR_2, WIDTH);

    await Promise.all([
      firstPage.waitForSelector("#events"),
      secondPage.waitForSelector("#events"),
    ]);

    // Wait until the other client is connected
    await waitForTextContent(firstPage, "#othersCount", "1");

    await firstPage.click("#broadcast-emoji");
    await delay(500);

    // Now check contents of page
    let eventsFirstPage = await getEvents(firstPage);
    let eventsSecondPage = await getEvents(secondPage);
    expect(eventsFirstPage).toEqual([]);
    expect(eventsSecondPage).toEqual([{ type: "EMOJI", emoji: "🔥" }]);

    await secondPage.click("#broadcast-number");
    await secondPage.click("#broadcast-emoji");
    await secondPage.click("#broadcast-number");
    await delay(500);

    // Check again
    eventsFirstPage = await getEvents(firstPage);
    eventsSecondPage = await getEvents(secondPage);
    expect(eventsFirstPage).toEqual([42, { type: "EMOJI", emoji: "🔥" }, 42]);
    expect(eventsSecondPage).toEqual([{ type: "EMOJI", emoji: "🔥" }]);

    await firstPage.close();
    await secondPage.close();
  });
});
