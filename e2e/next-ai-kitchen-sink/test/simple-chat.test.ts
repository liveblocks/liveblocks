import { test, expect } from "@playwright/test";

test.describe("Simple Chat", () => {
  test("should handle ping-pong interaction", async ({ page }) => {
    await page.goto("/simple");

    // Wait for the chat interface to load
    await expect(page.locator(".lb-ai-chat-composer")).toBeVisible();

    // Find the text input (editor)
    const textInput = page.locator(".lb-ai-chat-composer-editor");
    await expect(textInput).toBeVisible();

    // Find the send button (initially should show SendIcon)
    const sendButton = page.locator(".lb-ai-chat-composer-action");
    await expect(sendButton).toBeVisible();

    // Enter "ping" in the text box
    await textInput.fill("ping");

    // Click the send button
    await sendButton.click();

    // Ensure the send button turns into an abort button (should now show StopIcon)
    // The button should change to have StopIcon and different data-variant
    await expect(sendButton).toHaveAttribute("data-variant", "secondary");

    // Wait for the send button to become enabled again (back to primary variant)
    await expect(sendButton).toHaveAttribute("data-variant", "primary", {
      timeout: 5000, // Give it up to 5 seconds for the AI response
    });

    // Check that a response message containing "pong" is received
    // Look for assistant messages using the correct class
    const assistantMessage = page
      .locator(".lb-ai-chat-assistant-message")
      .last();
    await expect(assistantMessage).toBeVisible({ timeout: 5000 });

    // Check if it contains "pong"
    await expect(assistantMessage).toContainText("pong", {
      timeout: 5000,
    });
  });
});
