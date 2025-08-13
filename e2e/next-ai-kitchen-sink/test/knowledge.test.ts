import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function setupAiChat(page: Page) {
  // The knowledge page has the chat trigger button with test ID
  const triggerButton = page.getByTestId("ai-chat-trigger");

  // Check if popover is already open
  const isOpen = (await triggerButton.getAttribute("data-state")) === "open";
  if (!isOpen) {
    await triggerButton.click();
  }

  // Wait for the AI chat popover to be visible
  await expect(page.locator(".lb-ai-composer")).toBeVisible({
    timeout: 10000,
  });

  // Find the text input and send button
  const textInput = page.locator(".lb-ai-composer-editor");
  const sendButton = page.locator(".lb-ai-composer-action");

  // Wait for the send button to be present and ready
  await expect(sendButton).toBeVisible({ timeout: 10000 });

  // Wait for the composer form to not be disabled
  const composerForm = page.locator(".lb-ai-composer-form");
  await expect(composerForm).not.toHaveAttribute("disabled", {
    timeout: 10000,
  });

  // If there's an ongoing operation (abort button is enabled), click it first to clear state
  if ((await sendButton.getAttribute("aria-label")) === "Abort response") {
    await sendButton.click();
    // Wait for it to return to send state
    await expect(sendButton).toHaveAttribute("aria-label", "Send", {
      timeout: 15000,
    });
  }

  // Clear any existing text
  await textInput.clear();

  return { textInput, sendButton };
}

async function sendAiMessage(page: Page, message: string) {
  const { textInput, sendButton } = await setupAiChat(page);

  await textInput.fill(message);

  // Wait for the button to be enabled after filling the text
  await expect(sendButton).toBeEnabled({ timeout: 10000 });

  await sendButton.click({ timeout: 5000 });

  // Verify the message was sent (appears in the chat)
  // Use a user message selector to be more specific and avoid duplicates
  await expect(page.locator(".lb-ai-chat-user-message").last()).toContainText(
    message
  );
}

test.describe("Knowledge Registration", () => {
  test("should use registered knowledge about current view and todos", async ({
    page,
  }) => {
    // Clean up - delete the knowledge chat to start fresh
    await page.goto("/chats");
    await expect(page.locator("h1")).toHaveText("List of all chats");

    const knowledgeChatLink = page.locator('a[href="/chats/todo125"]');
    if (await knowledgeChatLink.isVisible()) {
      const deleteButton = knowledgeChatLink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(knowledgeChatLink).not.toBeVisible();
    }

    // Go to knowledge page
    await page.goto("/knowledge");

    // Wait for the page to load - verify default tab is "Todo app"
    await expect(
      page.locator('button.font-bold:has-text("Todo app")')
    ).toBeVisible();

    // Verify the default todos are visible
    await expect(page.locator('li:has-text("Get groceries")')).toBeVisible();
    await expect(page.locator('li:has-text("Go to the gym")')).toBeVisible();
    await expect(page.locator('li:has-text("Cook dinner")')).toBeVisible();

    // Ask AI about the current view - it should know we're on the Todo list
    await sendAiMessage(page, "What is the current view in the app?");

    // Wait for AI response that should mention the todo view
    await expect(
      page.locator("text=Todo").or(page.locator("text=todo"))
    ).toBeVisible({ timeout: 30000 });

    // Ask AI about the todos - it should know the specific items
    await sendAiMessage(page, "What todos do I have?");

    // Wait for AI response that should include the todo items
    await page.waitForTimeout(10000);
    // The AI should mention the specific todos in its response - use first() to handle duplicates
    await expect(
      page.locator("text=groceries").or(page.locator("text=Groceries")).first()
    ).toBeVisible({ timeout: 20000 });
  });

  test("should use nickname knowledge when enabled", async ({ page }) => {
    // Clean up first
    await page.goto("/chats");
    const knowledgeChatLink = page.locator('a[href="/chats/todo125"]');
    if (await knowledgeChatLink.isVisible()) {
      const deleteButton = knowledgeChatLink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(knowledgeChatLink).not.toBeVisible();
    }

    await page.goto("/knowledge");

    // Find the nickname checkbox specifically by its label text
    const nicknameCheckbox = page.locator(
      'label:has-text("Share my nickname") input[type="checkbox"]'
    );

    // Check its initial state (might be checked from previous test)
    const isChecked = await nicknameCheckbox.isChecked();
    if (isChecked) {
      await nicknameCheckbox.uncheck();
    }
    await expect(nicknameCheckbox).not.toBeChecked();

    // Ask AI about my name - it shouldn't know it
    await sendAiMessage(page, "What is my name or nickname?");
    await page.waitForTimeout(10000);

    // Now enable nickname sharing
    await nicknameCheckbox.check();
    await expect(nicknameCheckbox).toBeChecked();

    // Ask AI again about my name - now it should know "nvie"
    await sendAiMessage(page, "What is my nickname?");

    // Wait for AI response that should include "nvie"
    await expect(page.locator("text=nvie")).toBeVisible({ timeout: 30000 });
  });

  test("should use dark mode knowledge and tool", async ({ page }) => {
    // Clean up first
    await page.goto("/chats");
    const knowledgeChatLink = page.locator('a[href="/chats/todo125"]');
    if (await knowledgeChatLink.isVisible()) {
      const deleteButton = knowledgeChatLink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(knowledgeChatLink).not.toBeVisible();
    }

    await page.goto("/knowledge");

    // Find the expose dark mode checkbox by its label text
    const exposeCheckbox = page.locator(
      'label:has-text("Expose dark mode as knowledge & tool") input[type="checkbox"]'
    );

    // Ensure it's checked (default state according to code)
    const isChecked = await exposeCheckbox.isChecked();
    if (!isChecked) {
      await exposeCheckbox.check();
    }
    await expect(exposeCheckbox).toBeChecked();

    // Find the dark mode toggle checkbox (it has the sun/moon emoji in the label)
    const darkModeCheckbox = page
      .locator("label")
      .filter({ hasText: /Dark mode [☀️🌙]/ })
      .locator('input[type="checkbox"]');

    // Ensure we start in light mode
    const isDarkMode = await darkModeCheckbox.isChecked();
    if (isDarkMode) {
      await darkModeCheckbox.uncheck();
    }
    await expect(darkModeCheckbox).not.toBeChecked();
    await expect(page.locator("text=☀️")).toBeVisible();

    // Ask AI about current mode
    await sendAiMessage(page, "What is the current dark mode setting?");

    // Wait for AI response about light mode
    await expect(
      page.locator("text=light").or(page.locator("text=Light"))
    ).toBeVisible({ timeout: 30000 });

    // Ask AI to change to dark mode using the tool
    await sendAiMessage(page, "Change the app to dark mode");

    // Wait for the tool execution and verify dark mode is now enabled
    await page.waitForTimeout(10000);
    await expect(page.locator("text=🌙")).toBeVisible({ timeout: 15000 });
    await expect(darkModeCheckbox).toBeChecked();
  });

  test("should update knowledge when switching between tabs", async ({
    page,
  }) => {
    // Clean up first
    await page.goto("/chats");
    const knowledgeChatLink = page.locator('a[href="/chats/todo125"]');
    if (await knowledgeChatLink.isVisible()) {
      const deleteButton = knowledgeChatLink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(knowledgeChatLink).not.toBeVisible();
    }

    await page.goto("/knowledge");

    // Start on Todo app tab
    await expect(page.getByTestId("tab-todo-app")).toHaveClass(/font-bold/);

    // Ask about current view
    await sendAiMessage(page, "What view am I currently in?");
    await expect(page.locator(".lb-ai-chat-messages")).toContainText(/todo/i, {
      timeout: 30000,
    });

    // Switch to "Another app" tab
    await page.getByTestId("tab-another-app").click();
    await expect(page.getByTestId("tab-another-app")).toHaveClass(/font-bold/);
    await expect(page.locator("text=Another part of the app")).toBeVisible();

    // Ask about current view again - should now know it's "Another app"
    await sendAiMessage(page, "What is my current view now?");
    // Look for "Another" in the AI chat response, not in the UI
    await expect(page.locator(".lb-ai-chat-messages")).toContainText(
      /another/i,
      { timeout: 30000 }
    );

    // Switch to "Both" tab
    await page.getByTestId("tab-both").click();
    await expect(page.getByTestId("tab-both")).toHaveClass(/font-bold/);

    // Ask about current view - should know it's "Both apps"
    await sendAiMessage(page, "What view am I in now?");
    // Look for "Both" in the AI chat response, not in the UI
    await expect(page.locator(".lb-ai-chat-messages")).toContainText(/both/i, {
      timeout: 30000,
    });
  });

  test("should handle knowledge being disabled", async ({ page }) => {
    // Clean up first
    await page.goto("/chats");
    const knowledgeChatLink = page.locator('a[href="/chats/todo125"]');
    if (await knowledgeChatLink.isVisible()) {
      const deleteButton = knowledgeChatLink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(knowledgeChatLink).not.toBeVisible();
    }

    await page.goto("/knowledge");

    // Find and disable dark mode knowledge exposure
    const exposeCheckbox = page.getByTestId("expose-dark-mode-checkbox");
    await exposeCheckbox.uncheck();
    await expect(exposeCheckbox).not.toBeChecked();

    // Ask AI about dark mode - it should not have access to this knowledge
    await sendAiMessage(page, "What is the current dark mode setting?");

    // Wait for response - AI should indicate it doesn't know or can't access this info
    await page.waitForTimeout(10000);

    // Try to use the dark mode tool - it should not be available
    await sendAiMessage(page, "Change to dark mode");

    // Wait for response - AI should indicate it can't perform this action
    await page.waitForTimeout(10000);

    // Verify dark mode checkbox is still unchecked (tool didn't work)
    const darkModeCheckbox = page
      .locator("label")
      .filter({ hasText: /Dark mode [☀️🌙]/ })
      .locator('input[type="checkbox"]');
    await expect(darkModeCheckbox).not.toBeChecked();
  });
});
