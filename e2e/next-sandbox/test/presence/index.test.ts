/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser, default as puppeteer } from "puppeteer";
import { CONNECT_DELAY, delay, getJsonContent, getTextContent } from "../utils";

function getCurrentPresenseCount(page: Page) {
  return getTextContent(page, "me-count");
}

function getOthers(page: Page) {
  return getJsonContent(page, "others");
}

const TEST_URL = "http://localhost:3007/presence";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Presence", () => {
  it("me.count without initial presence should be empty", async () => {
    const page = await browserA.newPage();
    await page.goto(TEST_URL);

    expect(await getCurrentPresenseCount(page)).toEqual("");

    await page.close();
  });

  it("connect A => connect B => verify others on A and B", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    const othersFirstPage = await getOthers(firstPage);
    const othersSecondPage = await getOthers(secondPage);

    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await firstPage.close();
    await secondPage.close();
  });

  it("connect A => update presence A => connect B => verify presence A on B", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    await firstPage.click("#increment-button");

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    const othersSecondPage = await getOthers(secondPage);

    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({ count: 1 });

    await firstPage.close();
    await secondPage.close();
  });

  it("connect A => connect B => update presence A => verify presence A on B", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    await firstPage.click("#increment-button");

    await delay(100);

    const othersSecondPage = await getOthers(secondPage);

    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({ count: 1 });

    await firstPage.close();
    await secondPage.close();
  });

  it("connect A => connect B => verify other on B => disconnect A => verify others is empty on B", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

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
