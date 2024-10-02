import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage, sleep } from "../utils";

const TEST_URL = "http://localhost:3007/comments/composer";

function resetPage(page: Page) {
  return page.locator("#reset").click();
}

function getComposer(page: Page) {
  const container = page.locator("#composer");
  const editor = container.getByRole("textbox");
  const submitButton = container.locator("button[type='submit']");
  const mentionButton = container.locator(
    "button[aria-label='Mention someone']"
  );
  const emojiButton = container.locator("button[aria-label='Add emoji']");

  return {
    container,
    editor,
    submitButton,
    mentionButton,
    emojiButton,
  };
}

test.describe("Composer", () => {
  const user = 12; // Vincent
  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    page = await preparePage(
      `${TEST_URL}?room=${encodeURIComponent(room)}&user=${encodeURIComponent(user)}&bg=${encodeURIComponent("#cafbca")}`,
      { x: 0 }
    );
  });

  test.afterEach(() => page.close());

  test("should not be able to submit if empty", async () => {
    //
    // Action 1: leave the composer empty
    //
    {
      const { editor, submitButton } = getComposer(page);

      // The submit button should be disabled
      await expect(submitButton).toBeDisabled();

      // Pressing Enter should not do anything
      await editor.press("Enter");

      // TODO: How to assert that the composer wasn't submitted?
    }

    await resetPage(page);

    //
    // Action 2: fill the composer with whitespace and new lines
    //
    {
      const { editor, submitButton } = getComposer(page);

      await editor.pressSequentially("  ");
      await editor.press("Shift+Enter");
      await editor.pressSequentially("  ");

      // The submit button should be disabled
      await expect(submitButton).toBeDisabled();

      // Pressing Enter should not do anything
      await editor.press("Enter");

      // The composer wasn't submitted and cleared
      expect(await editor.textContent()).toEqual("    ");
    }
  });
});
