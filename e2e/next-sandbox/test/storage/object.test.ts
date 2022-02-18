/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import {
  delay,
  assertJsonContentAreEquals,
  assertItems,
  pickRandomItem,
  waitForContentToBeEquals,
  waitForContentToEqual,
  pickNumberOfUnderRedo,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#set", "#delete"]);
}

function pickRandomActionNested() {
  return pickRandomItem(["#set-nested", "#delete"]);
}

const TEST_URL = "http://localhost:3007/storage/object";

declare const browserA: Browser;
declare const browserB: Browser;

describe.skip("Storage - LiveObject", () => {
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

  it("fuzzy", async () => {
    await firstPage.click("#clear");
    await waitForContentToEqual(firstPage, secondPage, {});

    await assertJsonContentAreEquals(firstPage, secondPage);

    for (let i = 0; i < 20; i++) {
      firstPage.click("#set");
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    for (let i = 0; i < 100; i++) {
      // no await to create randomness
      firstPage.click(pickRandomAction());
      secondPage.click(pickRandomAction());
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForContentToEqual(firstPage, secondPage, {});
  });

  it("fuzzy with nested objects", async () => {
    await firstPage.click("#clear");
    await waitForContentToEqual(firstPage, secondPage, {});

    await assertJsonContentAreEquals(firstPage, secondPage);

    for (let i = 0; i < 20; i++) {
      firstPage.click("#set-nested");
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      firstPage.click(pickRandomActionNested());
      secondPage.click(pickRandomActionNested());
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForContentToEqual(firstPage, secondPage, {});
  });

  it("fuzzy with nested objects and undo/redo", async () => {
    await firstPage.click("#clear");
    await waitForContentToEqual(firstPage, secondPage, {});

    await assertJsonContentAreEquals(firstPage, secondPage);

    for (let i = 0; i < 20; i++) {
      firstPage.click("#set-nested");
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    for (let i = 0; i < 50; i++) {
      const nbofUndoRedo = pickNumberOfUnderRedo();

      if (nbofUndoRedo > 0) {
        for (let y = 0; y < nbofUndoRedo; y++) {
          firstPage.click("#undo");
        }
        for (let y = 0; y < nbofUndoRedo; y++) {
          firstPage.click("#redo");
        }
      } else {
        firstPage.click(pickRandomActionNested());
        secondPage.click(pickRandomActionNested());
      }

      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForContentToEqual(firstPage, secondPage, {});
  });
});
