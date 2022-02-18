import { test, expect, Page } from "@playwright/test";
import {
  assertItems,
  assertJsonContentAreEquals,
  delay,
  waitForContentToBeEquals,
} from "../utils";

const TEST_URL = "http://localhost:3007/batching";

test.beforeEach(async ({ page, context }) => {
  await page.goto(TEST_URL);
  const page2 = await context.newPage();
  await page2.goto(TEST_URL);
});

test.describe("Batching", () => {
  test("update storage and presence", async ({ page, context }) => {
    const pages = await context.pages();

    await Promise.all(
      pages.map(async (p) => {
        return expect(p.locator("#clear")).toBeVisible();
      })
    );

    await page.locator("#clear").click();

    // await assertItems(pages, []);

    await expect(page.locator("#items")).toHaveText("[]");

    // await delay(50000);

    await expect(page.locator("#itemsCount")).toContainText("0");

    await page.locator("#update-storage-presence-batch").click();

    await waitForContentToBeEquals(pages[0], pages[1]);
    // await assertJsonContentAreEquals(pages[0], pages[1]);
  });
});
// describe("Batching", () => {
//   let firstPage: Page, secondPage: Page;
//   beforeAll(async () => {
//     await Promise.all([firstPage.goto(TEST_URL), secondPage.goto(TEST_URL)]);

//     await Promise.all([
//       firstPage.waitForSelector("#clear"),
//       secondPage.waitForSelector("#clear"),
//     ]);
//   });

//   afterAll(async () => {
//     await firstPage.close();
//     await secondPage.close();
//   });

//   it("update storage and presence", async () => {
//     await firstPage.click("#clear");

//     await waitForNElements([firstPage, secondPage], 0);
//     await assertItems([firstPage, secondPage], []);

//     await firstPage.click("#update-storage-presence-batch");
//     await waitForNElements([firstPage, secondPage], 1);
//     await assertJsonContentAreEquals(firstPage, secondPage);

//     const othersFirstPage = await getJsonContent(firstPage, "others");
//     expect(othersFirstPage.length).toEqual(1);
//     expect(othersFirstPage[0].presence).toEqual({});

//     const othersSecondPage = await getJsonContent(secondPage, "others");
//     expect(othersSecondPage.length).toEqual(1);
//     expect(othersSecondPage[0].presence.count).toEqual(1);

//     await firstPage.click("#clear");
//     await waitForNElements([firstPage, secondPage], 0);
//     await assertItems([firstPage, secondPage], []);
//   });
// });
