import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage } from "../utils";

const TEST_URL = "http://localhost:3007/comments/thread";

test.describe("Custom thread comments", () => {
  let page: Page;

  test.beforeAll(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    page = await preparePage(
      `${TEST_URL}?room=${encodeURIComponent(room)}&user=1`
    );
    await expect(page.getByText("Hello from e2e")).toBeVisible();
  });

  test.afterAll(() => page.close());

  test("renders custom comment content", async () => {
    // ➡️ Custom content wrappers are visible
    await expect(
      page.locator("[data-testid='custom-comment-before']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='custom-comment-after']")
    ).toBeVisible();
  });

  test("renders custom avatar, author, and additional content", async () => {
    // ➡️ Custom avatar, author, and additional content are visible
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

  test("renders custom dropdown items with custom Comment component", async () => {
    const commentActions = page
      .locator(".lb-comment")
      .locator(".lb-comment-actions");

    // Open the dropdown
    const dropdownButton = commentActions.locator("button").last();
    await dropdownButton.click();

    // ➡️ Custom dropdown item is visible
    await expect(
      page.locator("[data-testid='custom-dropdown-item']")
    ).toBeVisible({ timeout: 2000 });
    await expect(
      page.locator("[data-testid='custom-dropdown-item']")
    ).toContainText("cm_123");
  });

  test("preserves default dropdown items when using children in commentDropdownItems", async () => {
    const commentActions = page
      .locator(".lb-comment")
      .locator(".lb-comment-actions");

    // Open the dropdown
    const dropdownButton = commentActions.locator("button").last();
    await dropdownButton.click();

    const dropdown = page.locator(".lb-dropdown");

    // ➡️ Default items (Edit and Delete) are present
    await expect(dropdown).toBeVisible({ timeout: 2000 });
    await expect(dropdown.getByText("Edit comment")).toBeVisible();
    await expect(dropdown.getByText("Delete comment")).toBeVisible();

    // ➡️ Custom item is also present
    await expect(
      page.locator("[data-testid='custom-dropdown-item']")
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='custom-dropdown-item']")
    ).toContainText("cm_123");
  });
});
