/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import {
  delay,
  assertJsonContentAreEquals,
  assertItems,
  pickRandomItem,
  pickNumberOfUnderRedo,
  waitForContentToBeEquals,
  waitForNElements,
} from "../utils";

function pickRandomActionWithUndoRedo() {
  return pickRandomItem(["#push", "#delete", "#move", "#undo", "#redo"]);
}

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move"]);
}

const TEST_URL = "http://localhost:3007/storage/list";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Storage - LiveList", () => {
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

  it("list push basic", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await waitForNElements([firstPage, secondPage], 1);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await waitForNElements([firstPage, secondPage], 2);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await waitForNElements([firstPage, secondPage], 3);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });

  it("list move", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 5; i++) {
      await firstPage.click("#push");
      await delay(50);
    }

    await waitForNElements([firstPage, secondPage], 5);

    await assertJsonContentAreEquals(firstPage, secondPage);

    for (let i = 0; i < 10; i++) {
      await firstPage.click("#move");
      await delay(50);
    }

    await delay(1000);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });

  it("push conflicts", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    await assertJsonContentAreEquals(firstPage, secondPage);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await waitForNElements([firstPage, secondPage], 20);
    await assertJsonContentAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });

  it("fuzzy allo", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }
    await waitForNElements([firstPage, secondPage], 20);
    await waitForContentToBeEquals(firstPage, secondPage);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      firstPage.click(pickRandomActionWithUndoRedo());
      secondPage.click(pickRandomActionWithUndoRedo());
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });

  it("fuzzy with full undo/redo", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await waitForNElements([firstPage, secondPage], 20);

    await assertJsonContentAreEquals(firstPage, secondPage);

    const pages = [firstPage, secondPage];
    for (let i = 0; i < 50; i++) {
      // no await to create randomness

      pages.forEach((page) => {
        const nbofUndoRedo = pickNumberOfUnderRedo();

        if (nbofUndoRedo > 0) {
          for (let y = 0; y < nbofUndoRedo; y++) {
            page.click("#undo");
          }
          for (let y = 0; y < nbofUndoRedo; y++) {
            page.click("#redo");
          }
        } else {
          page.click(pickRandomAction());
        }
      });

      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], []);
  });
});
