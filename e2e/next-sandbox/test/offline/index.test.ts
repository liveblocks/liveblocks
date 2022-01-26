/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import {
  CONNECT_DELAY,
  delay,
  assertJsonContentAreEquals,
  assertItems,
  pickRandomItem,
  getJsonContent,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#undo", "#redo"]);
}

const TEST_URL = "http://localhost:3007/offline";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Storage - Offline - LiveList", () => {
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

  it("one client offline with offline changes", async () => {
    await firstPage.click("#clear");
    await secondPage.click("#clear");
    await delay(1000);

    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#closeWebsocket");
    await delay(50);
    await firstPage.click("#push");
    await secondPage.click("#push");
    await delay(1000);

    const firstPageItems = await getJsonContent(firstPage, "items");
    const secondPageItems = await getJsonContent(secondPage, "items");

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await firstPage.click("#sendCloseEvent");

    await delay(3000);

    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);
  });

  it("fuzzy", async () => {
    await firstPage.click("#clear");
    await secondPage.click("#clear");
    await delay(1000);

    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#closeWebsocket");
    await delay(50);

    for (let i = 0; i < 100; i++) {
      // no await to create randomness
      firstPage.click(pickRandomAction());
      secondPage.click(pickRandomAction());
      await delay(50);
    }

    await delay(1000);

    await firstPage.click("#sendCloseEvent");

    await delay(5000);

    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);
  });
});
