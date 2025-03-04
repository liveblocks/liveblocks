import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, getJson, preparePage, waitForJson } from "../utils";

const SLOW = { timeout: 20_000 };
const TEST_URL =
  "http://localhost:3007/user-notification-settings/with-suspense";

// eslint-disable-next-line @typescript-eslint/unbound-method
const skipOnCI = process.env.CI ? test.skip : test;

test.describe("User notification settings", () => {
  const user1 = 13; // Aurélien

  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    page = await preparePage(
      `${TEST_URL}?room=${encodeURIComponent(room)}&user=${encodeURIComponent(user1)}`
    );
  });

  test.afterEach(async () => await page.close());

  // skipping on CI because of waiting on the backend to be deliver
  // on `main` branch on `dev`
  // This test fails sometime on CI but not in local.
  skipOnCI("update user notification settings", async () => {
    // wait until page is loaded
    await waitForJson(page, "#name", "Aurélien D. D.", SLOW);
    await waitForJson(page, "#isLoading", false, SLOW);
    await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);

    for (const channel of ["email", "slack", "teams", "webPush"]) {
      const [old1, old2] = await Promise.all([
        getJson(page, `#${channel}ThreadKind`),
        getJson(page, `#${channel}TextMentionKind`),
      ]);

      await page.locator(`#${channel}_update_channel`).click();

      await waitForJson(page, "#isLoading", false, SLOW);
      await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);

      await expect(page.locator(`#${channel}ThreadKind`)).toContainText(
        old1 === "Yes" ? "No" : "Yes"
      );
      await expect(page.locator(`#${channel}TextMentionKind`)).toContainText(
        old2 === "Yes" ? "No" : "Yes"
      );
    }
  });
});
