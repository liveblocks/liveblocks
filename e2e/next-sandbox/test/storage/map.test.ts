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
  waitForNElements,
  waitForContentToBeEquals,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#set", "#delete"]);
}

const TEST_URL = "http://localhost:3007/storage/map";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Storage - LiveMap", () => {
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
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], {});

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      firstPage.click(pickRandomAction());
      secondPage.click(pickRandomAction());
      await delay(50);
    }

    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
  });

  it("fuzzy with full undo/redo", async () => {
    await firstPage.click("#clear");
    await waitForNElements([firstPage, secondPage], 0);
    await assertItems([firstPage, secondPage], {});

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
  });
});
