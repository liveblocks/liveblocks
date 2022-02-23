import { Page, test, expect } from "@playwright/test";
import {
  preparePage,
  delay,
  getJsonContent,
  getTextContent,
  preparePages,
  assertContainText,
} from "../utils";

function getCurrentPresenseCount(page: Page) {
  return getTextContent(page, "me-count");
}

function getOthers(page: Page) {
  return getJsonContent(page, "others");
}

const TEST_URL = "http://localhost:3007/presence";

test.describe("Presence", () => {
  test("connect A => connect B => verify others on A and B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-scenario1";
    const firstPage = await preparePage(testUrl);

    const secondPage = await preparePage(testUrl);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "1", "othersCount");

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
    const testUrl = TEST_URL + "?room=e2e-presence-scenario2";
    const firstPage = await preparePage(testUrl);

    await firstPage.click("#increment-button");

    const secondPage = await preparePage(testUrl);

    await assertContainText([firstPage, secondPage], "1", "othersCount");

    const othersSecondPage = await getOthers(secondPage);

    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({ count: 1 });

    await firstPage.close();
    await secondPage.close();
  });

  test("connect A => connect B => update presence A => verify presence A on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-scenario3";
    const firstPage = await preparePage(testUrl);

    const secondPage = await preparePage(testUrl);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "1", "othersCount");

    await firstPage.click("#increment-button");

    await delay(100);

    const othersSecondPage = await getOthers(secondPage);

    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({ count: 1 });

    await firstPage.close();
    await secondPage.close();
  });

  test("connect A => connect B => verify other on B => disconnect A => verify others is empty on B", async () => {
    const testUrl = TEST_URL + "?room=e2e-presence-scenario4";
    const firstPage = await preparePage(testUrl);

    const secondPage = await preparePage(testUrl);

    await Promise.all([
      firstPage.waitForSelector("#others"),
      secondPage.waitForSelector("#others"),
    ]);

    await assertContainText([firstPage, secondPage], "1", "othersCount");

    let othersSecondPage = await getOthers(secondPage);
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await firstPage.close();

    await delay(100);

    othersSecondPage = await getOthers(secondPage);
    expect(othersSecondPage.length).toEqual(0);

    await secondPage.close();
  });
});
