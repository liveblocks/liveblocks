import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage, waitForJson } from "../utils";

const SLOW = { timeout: 20_000 };
const TEST_URL =
  "http://localhost:3007/channels-notification-settings/with-suspense";

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

  test("update channels notification settings", async () => {
    // wait until page is loaded
    await waitForJson(page, "#name", "Aurélien D. D.", SLOW);
    await waitForJson(page, "#isLoading", false, SLOW);
    await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);

    for (const channel of ["email", "slack", "teams", "webPush"]) {
      const [old1, old2] = await Promise.all([
        page.locator(`#${channel}ThreadKind`).innerText(),
        page.locator(`#${channel}TextMentionKind`).innerText(),
      ]);

      await page.locator(`#${channel}_update_channel`).click();

      await waitForJson(page, "#isLoading", false, SLOW);
      await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);

      await expect(page.locator(`#${channel}ThreadKind`)).toContainText(
        old1 === '"Yes"' ? '"No"' : '"Yes"'
      );
      await expect(page.locator(`#${channel}ThreadKind`)).toContainText(
        old2 === '"Yes"' ? '"No"' : '"Yes"'
      );
    }
  });
});
