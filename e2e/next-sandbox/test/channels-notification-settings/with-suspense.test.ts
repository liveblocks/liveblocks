import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { genRoomId, preparePage, waitForJson } from "../utils";

const SLOW = { timeout: 40_000 };
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

  test("load channels notification settings", async () => {
    // wait until page is loaded
    await waitForJson(page, "#name", "Aurélien D. D.", SLOW);
    await waitForJson(page, "#isLoading", false, SLOW);
    // await waitForJson(page, "#error", JSON.stringify(undefined), SLOW);
  });
});
