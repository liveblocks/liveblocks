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

const TEST_URL = "http://localhost:3007/zustand";

declare const browserA: Browser;
declare const browserB: Browser;

function pickRandomActionWithUndoRedo() {
  return pickRandomItem(["#push", "#delete", "#undo", "#redo"]);
}

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

  it("array push basic + presence", async () => {
    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    const othersFirstPage = await getJsonContent(firstPage, "others");
    const othersSecondPage = await getJsonContent(secondPage, "others");

    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

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

  it("with enter and leave room", async () => {
    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await delay(50);
    await firstPage.click("#push");
    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await secondPage.click("#leave"); // Leave
    await delay(500);

    await firstPage.click("#push");
    await delay(1000);

    await secondPage.click("#enter"); // Enter
    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);
  });

  it("fuzzy", async () => {
    await firstPage.click("#clear");
    await delay(2000);
    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await delay(2000);

    await assertJsonContentAreEquals(firstPage, secondPage);

    for (let i = 0; i < 200; i++) {
      // no await to create randomness
      firstPage.click(pickRandomActionWithUndoRedo());
      secondPage.click(pickRandomActionWithUndoRedo());
      await delay(50);
    }

    await delay(2000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);
  });
});
