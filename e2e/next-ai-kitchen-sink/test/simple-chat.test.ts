import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createRandomChat, cleanupAllChats } from "./test-helpers";

async function setupSimpleChat(page: Page, chatId: string) {
  await page.goto(`/simple/${chatId}`);

  // Wait for the chat interface to load
  await expect(page.locator(".lb-ai-composer")).toBeVisible();

  // Find the text input and send button
  const textInput = page.locator(".lb-ai-composer-editor");
  const sendButton = page.locator(".lb-ai-composer-action");

  // If there's an ongoing operation (abort button is enabled), click it first to clear state
  if (
    (await sendButton.isEnabled()) &&
    (await sendButton.getAttribute("aria-label")) === "Abort response"
  ) {
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

test.describe("Simple Chat", () => {
  test.afterEach(async () => {
    await cleanupAllChats();
  });

  test("should handle ping-pong interaction", async ({ page }) => {
    const chatId = createRandomChat(page);
    const { textInput, sendButton } = await setupSimpleChat(page, chatId);

    await test.step("Send ping message", async () => {
      // Perform the ping-pong interaction
      await textInput.fill("ping");
      await sendButton.click();
    });

    await test.step("Verify AI is processing request", async () => {
      // Ensure the send button turns into an abort button (should now show StopIcon)
      // The button should change to show "Abort response" aria-label
      await expect(sendButton).toHaveAttribute("aria-label", "Abort response");
    });

    await test.step("Wait for AI response completion", async () => {
      // Wait for the send button to become enabled again (back to send state)
      await expect(sendButton).toHaveAttribute("aria-label", "Send", {
        timeout: 15000, // Give it up to 15 seconds for the AI response
      });
    });

    await test.step("Verify pong response received", async () => {
      // Check that a response message containing "pong" is received
      // Look for assistant messages using the correct class
      const assistantMessage = page
        .locator(".lb-ai-chat-assistant-message")
        .last();
      await expect(assistantMessage).toBeVisible({ timeout: 15000 });

      // Check if it contains "pong"
      await expect(assistantMessage).toContainText("pong", {
        timeout: 15000,
      });
    });
  });

  test("should abort AI response when abort button is clicked", async ({
    page,
  }) => {
    const chatId = createRandomChat(page);
    const { textInput, sendButton } = await setupSimpleChat(page, chatId);

    await test.step("Send long-form request", async () => {
      // Ask a question that should generate a long response
      await textInput.fill(
        "Write a detailed 500-word essay about the history of artificial intelligence, covering major milestones from the 1950s to today."
      );

      // The button should be enabled once we have text
      await expect(sendButton).toBeEnabled({ timeout: 15000 });
      await sendButton.click();
    });

    await test.step("Verify AI starts processing and abort", async () => {
      // Verify the button changes to abort state
      await expect(sendButton).toHaveAttribute("aria-label", "Abort response");

      // Click the abort button while the AI is generating
      await sendButton.click();

      // Verify the button goes back to send state
      await expect(sendButton).toHaveAttribute("aria-label", "Send", {
        timeout: 15000,
      });
    });

    await test.step("Verify messages and abort behavior", async () => {
      // Verify the user message exists
      const userMessage = page.locator(".lb-ai-chat-user-message").last();
      await expect(userMessage).toBeVisible();
      await expect(userMessage).toContainText(
        "Write a detailed 500-word essay"
      );

      // The assistant message should exist (created optimistically) but may be hidden when aborted
      const assistantMessage = page
        .locator(".lb-ai-chat-assistant-message")
        .last();

      // The assistant message must exist in the DOM (created optimistically)
      await expect(assistantMessage).toHaveCount(1);

      // Get the message text - even if hidden, we can still read the content
      const messageText = await assistantMessage.textContent();

      // The message should be incomplete due to abort - much shorter than a full 500-word essay
      // A full essay would be significantly longer than 500 characters
      expect(messageText?.length || 0).toBeLessThan(500);
    });
  });
});
