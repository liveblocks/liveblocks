import { Page, test, expect } from "@playwright/test";

import {
  delay,
  pickRandomItem,
  getJsonContent,
  preparePages,
  assertContainText,
  waitForContentToBeEquals,
} from "../utils";

const TEST_URL = "http://localhost:3007/zustand";

function pickRandomActionWithUndoRedo() {
  return pickRandomItem(["#push", "#delete", "#undo", "#redo"]);
}

test.describe("Zustand", () => {
  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const roomName = `e2e-zustand-${testInfo.title.replaceAll(" ", "-")}`;
    pages = await preparePages(`${TEST_URL}?room=${roomName}`);
  });

  test.afterEach(async () => {
    pages.forEach(async (page) => {
      await page.close();
    });
  });

  test("array push basic + presence", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    await delay(3000);
    const othersFirstPage = await getJsonContent(pages[0], "others");
    const othersSecondPage = await getJsonContent(pages[1], "others");

    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await pages[0].click("#push");
    await waitForContentToBeEquals(pages);

    await pages[0].click("#push");
    await waitForContentToBeEquals(pages);

    await pages[0].click("#push");
    await waitForContentToBeEquals(pages);

    await pages[0].click("#clear");
    await assertContainText(pages, "0");
  });

  test("with enter and leave room", async () => {
    await pages[0].click("#clear");
    await assertContainText(pages, "0");

    await pages[0].click("#push");
    await delay(50);
    await pages[0].click("#push");
    await waitForContentToBeEquals(pages);

    await pages[1].click("#leave"); // Leave
    await delay(500);

    await pages[0].click("#push");
    await delay(1000);

    await pages[1].click("#enter"); // Enter
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

    for (let i = 0; i < 50; i++) {
      // no await to create randomness
      pages[0].click(pickRandomActionWithUndoRedo());
      pages[1].click(pickRandomActionWithUndoRedo());
      await delay(50);
    }

    await waitForContentToBeEquals(pages);

    await pages[0].click("#clear");
    await assertContainText(pages, "0");
  });
});
