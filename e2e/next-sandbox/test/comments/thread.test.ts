import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage } from "../utils";

const TEST_URL = "http://localhost:3007/comments/thread";

test.describe("Custom thread comments", () => {
  let page: Page;

  test.beforeAll(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    page = await preparePage(`${TEST_URL}?room=${encodeURIComponent(room)}`);
    await expect(page.getByText("Hello from e2e")).toBeVisible();
  });

  test.afterAll(() => page.close());

  test("renders custom comment content", async () => {
    await expect(
      page.locator("[data-testid='custom-comment-before']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='custom-comment-after']")
    ).toBeVisible();
  });

  test("renders custom avatar, author, and additional content", async () => {
    await expect(
      page.locator("[data-testid='custom-comment-avatar']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='custom-comment-author']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='custom-comment-additional']")
    ).toBeVisible();
  });
});
