import { test, expect } from "@playwright/test";

test.describe("Knowledge Registration - Simple", () => {
  test("should open knowledge page and interact with AI chat", async ({
    page,
  }) => {
    // Clean up first - delete the knowledge chat if it exists
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

    // The knowledge page has the chat trigger in the bottom right corner
    const triggerButton = page.locator(".fixed.bottom-8.right-8 button");
    await expect(triggerButton).toBeVisible();

    // Check if popover is already open
    const dataState = await triggerButton.getAttribute("data-state");
    if (dataState !== "open") {
      await triggerButton.click();
      await page.waitForTimeout(1000); // Give popover time to open
    }

    // Wait for the AI chat popover to be visible
    await expect(page.locator(".lb-ai-chat-composer")).toBeVisible({
      timeout: 10000,
    });

    // Find the text input and send button
    const textInput = page.locator(".lb-ai-chat-composer-editor");
    const sendButton = page.locator(".lb-ai-chat-composer-action");

    // If there's an ongoing operation (abort button is enabled), click it first to clear state
    const buttonVariant = await sendButton.getAttribute("data-variant");
    if (buttonVariant === "secondary") {
      await sendButton.click();
      // Wait for it to return to send state
      await expect(sendButton).toHaveAttribute("data-variant", "primary");
    }

    // Clear any existing text and send a simple message
    await textInput.clear();
    await textInput.fill("What is the current view in the app?");
    await sendButton.click({ timeout: 5000 });

    // Verify the message was sent (appears in the chat) - use first() to handle duplicate messages
    await expect(
      page.locator("text=What is the current view in the app?").first()
    ).toBeVisible();

    // Wait for any AI response to appear
    await page.waitForTimeout(10000);

    console.log("Test completed successfully");
  });
});
