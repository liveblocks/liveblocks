import { Page, test, expect } from "@playwright/test";

import {
  delay,
  pickRandomItem,
  getJsonContent,
  waitForContentToBeEquals,
  preparePages,
  assertContainText,
} from "../utils";

function pickRandomAction() {
  return pickRandomItem(["#push", "#delete", "#move", "#undo", "#redo"]);
}

const TEST_URL = "http://localhost:3007/offline/";

test.describe("Offline", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-offline-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("one client offline with offline changes", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    await pages[0].click("#push");
    await assertContainText(pages, "1");

    await pages[0].click("#closeWebsocket");
    await delay(50);
    await pages[0].click("#push");
    await pages[1].click("#push");
    await assertContainText([pages[0]], "2");

    const firstPageItems = await getJsonContent(pages[0], "items");
    const secondPageItems = await getJsonContent(pages[1], "items");

    expect(firstPageItems.length).toEqual(2);
    expect(secondPageItems.length).toEqual(2);

    await pages[0].click("#sendCloseEvent");
    await delay(3000);

    await waitForContentToBeEquals(pages);

    await pages[0].click("#clear");
    await assertContainText(pages, "0");
  });

  test("fuzzy", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    for (let i = 0; i < 10; i++) {
      // no await to create randomness
      pages[0].click("#push");
      pages[1].click("#push");
      await delay(50);
    }

    await waitForContentToBeEquals(pages);

    await pages[0].click("#closeWebsocket");
    await delay(50);

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages[0].click(pickRandomAction());
      pages[1].click(pickRandomAction());
      await delay(50);
    }

    await delay(2000);

    await pages[0].click("#sendCloseEvent");

    await delay(3000);

    await waitForContentToBeEquals(pages);

    await pages[0].click("#clear");
    await assertContainText(pages, "0");
  });
});
