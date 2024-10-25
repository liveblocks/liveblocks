import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage, waitForJson } from "../utils";

const SLOW = { timeout: 20_000 };
const TEST_URL = "http://localhost:3007/inbox-notifications/with-suspense";

test.describe("Inbox notifications", () => {
  const user1 = 12; // Vincent
  const user2 = 7; // Marc

  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await Promise.all([
      preparePage(
        `${TEST_URL}?room=${encodeURIComponent(room)}&user=${encodeURIComponent(user1)}&bg=${encodeURIComponent("#cafbca")}`,
        { x: 0 }
      ),
      preparePage(
        `${TEST_URL}?room=${encodeURIComponent(room)}&user=${encodeURIComponent(user2)}&bg=${encodeURIComponent("#e9ddf9")}`,
        { x: 640 }
      ),
    ]);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test("Inbox notifications synchronize", async () => {
    const [page1, page2] = pages;

    //
    // Setup
    //

    // Wait until the pages are loaded
    await waitForJson(page1, "#name", "Vincent D.", SLOW);
    await waitForJson(page2, "#name", "Marc B.", SLOW);

    // Clear out any existing comments before starting the test
    await page1.locator("#delete-all-mine").click({ force: true });
    await page2.locator("#delete-all-mine").click({ force: true });
    await waitForJson(pages, "#isSynced", true, SLOW);

    await waitForJson(pages, "#numOfThreads", 0, SLOW);

    //
    // Action 1: create a thread and a ping
    //
    {
      const newThreadComposer = page1
        .locator("#new-thread-composer")
        .getByRole("textbox");
      await newThreadComposer.fill("Hi team!");
      await newThreadComposer.press("Enter");

      // Await confirmation for the thread creation from the server
      await waitForJson(page1, "#isSynced", false);
      await waitForJson(page1, "#isSynced", true, SLOW);

      const replyComposer = page1
        .locator(".lb-thread-composer")
        .getByRole("textbox");

      // Add a comment to ping another user
      await replyComposer.fill("Pinging @M");
      await page1
        .locator(".lb-composer-suggestions-list-item")
        .getByText("Marc B.")
        .click();
      await replyComposer.press("Enter");
      await waitForJson(page1, "#isSynced", false);
      await waitForJson(page1, "#isSynced", true, SLOW);

      //
      // Assert 1: two comments + one notification should show up on the other side
      //
      // Synchronize
      await waitForJson(pages, "#numOfThreads", 1);
      await waitForJson(pages, "#numOfComments", 2, SLOW);
      await waitForJson(page1, "#numOfNotifications", 0);
      await waitForJson(page2, "#numOfNotifications", 1);

      // The two comments (on the left)
      await expect(page2.locator("#left")).toContainText("Hi team!");
      await expect(page2.locator("#left")).toContainText("Pinging @Marc B.");

      // The notification (on the right)
      await expect(page2.locator("#right")).toContainText(
        "Vincent D. commented in"
      );
      await expect(page2.locator("#right")).toContainText("Hi team!");
      await expect(page2.locator("#right")).toContainText("Pinging @Marc B.");
    }

    //
    // Action 2: create a thread and a ping
    //
    {
      const replyComposer = page2
        .locator(".lb-thread-composer")
        .getByRole("textbox");
      await replyComposer.fill("Cool stuff");
      await replyComposer.press("Enter");
      await waitForJson(page2, "#isSynced", false);
      await waitForJson(page2, "#isSynced", true, SLOW);

      //
      // Assert 1: Marc's reply will show up on the other side and also create a notification for Vincent
      //
      await waitForJson(pages, "#numOfThreads", 1);
      await waitForJson(pages, "#numOfComments", 3, SLOW);
      await waitForJson(pages, "#numOfNotifications", 1);

      // The two comments (on the left)
      await expect(page1.locator("#left")).toContainText("Cool stuff");

      // The notification (on the right)
      await expect(page1.locator("#right")).toContainText("Cool stuff");
    }

    //
    // Cleanup, as a courtesy to the next test run
    //
    await page1.locator("#delete-all-mine").click({ force: true });
    await page2.locator("#delete-all-mine").click({ force: true });
    await waitForJson(pages, "#isSynced", true);
  });
});
