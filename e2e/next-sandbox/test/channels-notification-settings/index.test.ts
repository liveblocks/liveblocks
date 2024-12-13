import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage, waitForJson } from "../utils";

const SLOW = { timeout: 20_000 };
const TEST_URL = "http://localhost:3007/channels-notification-settings";

test.describe("Channels notification settings", () => {
  const user1 = 13; // Aurélien

  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    page = await preparePage(
      `${TEST_URL}?room=${encodeURIComponent(room)}&user=${encodeURIComponent(user1)}`
    );
  });

  test.afterEach(async () => await page.close());

  test("load channels notification settings", async () => {
    // wait until page is loaded
    await waitForJson(page, "#name", "Aurélien D. D.", SLOW);
    await waitForJson(page, "#isLoading", false, SLOW);
    await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);

    for (const channel of ["email", "slack", "teams", "webPush"]) {
      await expect(page.locator(`#${channel}ThreadKind`)).toContainText("Yes");
      await expect(page.locator(`#${channel}TextMentionKind`)).toContainText(
        "Yes"
      );
    }
  });

  test("update channels notification settings", async () => {
    for (const channel of ["email", "slack", "teams", "webPush"]) {
      await page.click(`#${channel}_update_channel`);

      await waitForJson(page, "#isLoading", false, SLOW);
      await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);

      await expect(page.locator(`#${channel}ThreadKind`)).toContainText("No");
      await expect(page.locator(`#${channel}TextMentionKind`)).toContainText(
        "No"
      );
    }
  });
});
