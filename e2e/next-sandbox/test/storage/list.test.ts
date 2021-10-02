/**
 * @jest-environment ./puppeteer_environment
 */

import { Page, Browser } from "puppeteer";
import { CONNECT_DELAY, delay, getJsonContent } from "../utils";

function getItems(page: Page) {
  return getJsonContent(page, "items");
}

async function assertItemsAreEquals(firstPage: Page, secondPage: Page) {
  expect(await getItems(firstPage)).toEqual(await getItems(secondPage));
}

async function assertItems(pages: Page[], json: any) {
  for (const page of pages) {
    expect(await getItems(page)).toEqual(json);
  }
}

function pickRandomAction(actions = ["#push", "#delete", "#move"]) {
  return actions[Math.floor(Math.random() * actions.length)];
}

const TEST_URL = "http://localhost:3007/storage/list";

declare const browserA: Browser;
declare const browserB: Browser;

describe("Storage/list", () => {
  it("list push", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await delay(1000);
    await assertItemsAreEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await delay(1000);
    await assertItemsAreEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await delay(1000);
    await assertItemsAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.close();
    await secondPage.close();
  });

  it("list move", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 5; i++) {
      await firstPage.click("#push");
      await delay(50);
    }

    await delay(1000);

    await assertItemsAreEquals(firstPage, secondPage);

    for (let i = 0; i < 10; i++) {
      await firstPage.click("#move");
      await delay(50);
    }

    await delay(1000);
    await assertItemsAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.close();
    await secondPage.close();
  });

  it("push conflicts", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await assertItemsAreEquals(firstPage, secondPage);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await delay(2000);
    await assertItemsAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.close();
    await secondPage.close();
  });

  it.only("fuzzy", async () => {
    const firstPage = await browserA.newPage();
    await firstPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    const secondPage = await browserB.newPage();
    await secondPage.goto(TEST_URL);

    await delay(CONNECT_DELAY);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await delay(5000);

    await assertItemsAreEquals(firstPage, secondPage);

    for (let i = 0; i < 100; i++) {
      // no await to create randomness
      firstPage.click(pickRandomAction());
      secondPage.click(pickRandomAction());
      await delay(50);
    }

    await delay(5000);
    await assertItemsAreEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await delay(1000);
    await assertItems([firstPage, secondPage], []);

    await firstPage.close();
    await secondPage.close();
  });
});
