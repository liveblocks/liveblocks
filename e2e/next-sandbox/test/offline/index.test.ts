/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import {
  delay,
  assertJsonContentAreEquals,
  assertItems,
  pickRandomItem,
  getJsonContent,
  waitForNElements,
  waitForContentToBeEquals,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#undo", "#redo"]);
}

const TEST_URL = "http://localhost:3007/offline";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Storage - Offline - LiveList", () => {
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

  it("one client offline with offline changes", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await waitForNElements([firstPage, secondPage], 1);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#closeWebsocket");
    await delay(50);
    await firstPage.click("#push");
    await secondPage.click("#push");
    await waitForNElements([firstPage, secondPage], 2);

    const firstPageItems = await getJsonContent(firstPage, "items");
    const secondPageItems = await getJsonContent(secondPage, "items");

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await firstPage.click("#sendCloseEvent");

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });

  it("fuzzy", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#closeWebsocket");
    await delay(50);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      firstPage.click(pickRandomAction());
      secondPage.click(pickRandomAction());
      await delay(50);
    }

    await delay(1000);

    await firstPage.click("#sendCloseEvent");

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });
});
