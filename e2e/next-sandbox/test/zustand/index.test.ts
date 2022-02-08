/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import {
  CONNECT_DELAY,
  delay,
  assertJsonContentAreEquals,
  assertItems,
} from "../utils";

const TEST_URL = "http://localhost:3007/zustand";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Zustand - Array", () => {
  let firstPage: Page, secondPage: Page;
  beforeEach(async () => {
    firstPage = await browserA.newPage();
    secondPage = await browserB.newPage();

    await Promise.all([firstPage.goto(TEST_URL), secondPage.goto(TEST_URL)]);

    await delay(CONNECT_DELAY);
  });

  afterEach(async () => {
    await firstPage.close();
    await secondPage.close();
  });

  it("array push basic", async () => {
    await delay(2000);
    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);
  });
});
