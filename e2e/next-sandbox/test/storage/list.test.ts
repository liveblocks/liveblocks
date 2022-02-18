import { Page, test, expect, chromium } from "@playwright/test";

import {
  delay,
  assertJsonContentAreEquals,
  assertItems,
  pickRandomItem,
  pickNumberOfUnderRedo,
  waitForContentToBeEquals,
} from "../utils";

function pickRandomActionWithUndoRedo() {
  return pickRandomItem(["#push", "#delete", "#move", "#undo", "#redo"]);
}

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move"]);
}
const WIDTH = 640;
const HEIGHT = 800;

const TEST_URL = "http://localhost:3007/storage/list";

// test.beforeEach(async ({ page, context, browser, playwright }) => {
//   await page.goto(TEST_URL);

//   const newBrowser = await playwright.chromium.launch();
//   // Create a new incognito browser context.
//   const newContext = await newBrowser.newContext();

//   const page2 = await newContext.newPage();
//   await page2.goto(TEST_URL);
// });

// test.afterEach(async ({ page, context }) => {
//   const pages = context.pages();

//   pages.forEach(async (p) => {
//     await p.close();
//   });
// });

test.describe("Storage - LiveList", () => {
  let firstPage: Page, secondPage: Page;

  test.beforeAll(async ({}) => {
    const browser = await chromium.launch({
      args: [
        `--no-sandbox`,
        `--disable-setuid-sandbox`,
        `--window-size=${WIDTH},${HEIGHT}`,
        `--window-position=0,0`,
        "--disable-dev-shm-usage",
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 640, height: 800 },
    });
    firstPage = await context.newPage();
    await firstPage.goto(TEST_URL);

    const browser2 = await chromium.launch({
      args: [
        `--no-sandbox`,
        `--disable-setuid-sandbox`,
        `--window-size=${WIDTH},${HEIGHT}`,
        `--window-position=${WIDTH},0`,
        "--disable-dev-shm-usage",
      ],
    });
    const context2 = await browser2.newContext({
      viewport: { width: 640, height: 800 },
    });
    secondPage = await context2.newPage();
    await secondPage.goto(TEST_URL);
  });

  test.afterAll(async ({}) => {
    await firstPage.close();
    await secondPage.close();
  });

  test("list push basic", async () => {
    await firstPage.click("#clear");
    // await assertItems([firstPage, secondPage], []);

    await firstPage.click("#push");
    await expect(firstPage.locator("#itemsCount")).toContainText("1");
    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await expect(firstPage.locator("#itemsCount")).toContainText("2");
    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#push");
    await expect(firstPage.locator("#itemsCount")).toContainText("3");
    await waitForContentToBeEquals(firstPage, secondPage);

    await firstPage.click("#clear");
    await expect(firstPage.locator("#itemsCount")).toContainText("0");

    // await assertItems([firstPage, secondPage], []);
  });

  // test("list move", async ({ page, context }) => {
  //   await firstPage.click("#clear");
  //   await waitForNElements([firstPage, secondPage], 0);
  //   await assertItems([firstPage, secondPage], []);

  //   for (let i = 0; i < 5; i++) {
  //     await firstPage.click("#push");
  //     await delay(50);
  //   }

  //   await waitForNElements([firstPage, secondPage], 5);

  //   await assertJsonContentAreEquals(firstPage, secondPage);

  //   for (let i = 0; i < 10; i++) {
  //     await firstPage.click("#move");
  //     await delay(50);
  //   }

  //   await delay(1000);
  //   await assertJsonContentAreEquals(firstPage, secondPage);

  //   await firstPage.click("#clear");
  //   await waitForNElements([firstPage, secondPage], 0);
  //   await assertItems([firstPage, secondPage], []);
  // });

  // it("push conflicts", async () => {
  //   await firstPage.click("#clear");
  //   await waitForNElements([firstPage, secondPage], 0);
  //   await assertItems([firstPage, secondPage], []);

  //   await assertJsonContentAreEquals(firstPage, secondPage);

  //   for (let i = 0; i < 10; i++) {
  //     // no await to create randomness
  //     firstPage.click("#push");
  //     secondPage.click("#push");
  //     await delay(50);
  //   }

  //   await waitForNElements([firstPage, secondPage], 20);
  //   await assertJsonContentAreEquals(firstPage, secondPage);

  //   await firstPage.click("#clear");
  //   await waitForNElements([firstPage, secondPage], 0);
  //   await assertItems([firstPage, secondPage], []);
  // });

  // it("fuzzy allo", async () => {
  //   await firstPage.click("#clear");
  //   await waitForNElements([firstPage, secondPage], 0);
  //   await assertItems([firstPage, secondPage], []);

  //   for (let i = 0; i < 10; i++) {
  //     // no await to create randomness
  //     firstPage.click("#push");
  //     secondPage.click("#push");
  //     await delay(50);
  //   }
  //   await waitForNElements([firstPage, secondPage], 20);
  //   await waitForContentToBeEquals(firstPage, secondPage);

  //   for (let i = 0; i < 50; i++) {
  //     // no await to create randomness
  //     firstPage.click(pickRandomActionWithUndoRedo());
  //     secondPage.click(pickRandomActionWithUndoRedo());
  //     await delay(50);
  //   }

  //   await waitForContentToBeEquals(firstPage, secondPage);

  //   await firstPage.click("#clear");
  //   await waitForNElements([firstPage, secondPage], 0);
  //   await assertItems([firstPage, secondPage], []);
  // });

  test("fuzzy with full undo/redo", async () => {
    await firstPage.click("#clear");
    await expect(firstPage.locator("#itemsCount")).toContainText("0");
    // await assertItems([firstPage, secondPage], []);

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      firstPage.click("#push");
      secondPage.click("#push");
      await delay(50);
    }

    await expect(firstPage.locator("#itemsCount")).toContainText("20");

    await waitForContentToBeEquals(firstPage, secondPage);

    for (let i = 0; i < 150; i++) {
      // no await to create randomness

      [firstPage, secondPage].forEach((page) => {
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
    await expect(firstPage.locator("#itemsCount")).toContainText("0");
    // await assertItems([firstPage, secondPage], []);
  });
});
