/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import {
  getJsonContent,
  assertJsonContentAreEquals,
  assertItems,
  waitForNElements,
} from "../utils";

const TEST_URL = "http://localhost:3007/batching";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Batching", () => {
  let firstPage: Page, secondPage: Page;
  beforeAll(async () => {
    firstPage = await browserA.newPage();
    secondPage = await browserB.newPage();

    await Promise.all([firstPage.goto(TEST_URL), secondPage.goto(TEST_URL)]);

    await Promise.all([
      firstPage.waitForSelector("#clear"),
      secondPage.waitForSelector("#clear"),
    ]);
  });

  afterAll(async () => {
    await firstPage.close();
    await secondPage.close();
  });

  it("update storage and presence", async () => {
    await firstPage.click("#clear");

    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#update-storage-presence-batch");
    await waitForNElements([firstPage, secondPage], 1);
    await assertJsonContentAreEquals(firstPage, secondPage);

    const othersFirstPage = await getJsonContent(firstPage, "others");
    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});

    const othersSecondPage = await getJsonContent(secondPage, "others");
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence.count).toEqual(1);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });
});
