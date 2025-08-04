import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function setupChatComposer(page: Page) {
  // Wait for the chat interface to load
  await expect(page.locator('[role="textbox"]')).toBeVisible({ timeout: 10000 });

  // Find the text input and send button
  const textInput = page.locator('[role="textbox"]');
  const sendButton = page.locator('button[aria-label="Send"]');

  // If there's an ongoing operation (abort button is enabled), click it first to clear state
  const abortButton = page.locator('button[aria-label="Abort"]');
  if (await abortButton.isVisible()) {
    await abortButton.click();
    // Wait for it to return to send state
    await expect(sendButton).toBeVisible();
  }

  // Clear any existing text
  await textInput.clear();

  return { textInput, sendButton };
}

async function sendMessage(page: Page, message: string) {
  const { textInput, sendButton } = await setupChatComposer(page);
  
  await textInput.fill(message);
  await expect(sendButton).toBeEnabled({ timeout: 5000 });
  await sendButton.click();
  
  // Verify the message was sent (appears in the chat)
  await expect(page.locator(`text=${message}`)).toBeVisible();
}

test.describe("Concurrent Operations", () => {
  test("should handle rapid message sending without conflicts", async ({ page }) => {
    // Go to chats page and create a new chat
    await page.goto("/chats");
    await expect(page.locator("h1")).toHaveText("List of all chats");
    
    // Create a new chat
    await page.click('button:has-text("Start a new AI chat")');
    await expect(page).toHaveURL(/\/chats\/[a-zA-Z0-9_-]+/);
    
    const chatUrl = page.url();
    const chatId = chatUrl.split('/').pop();

    // Send first message
    await sendMessage(page, "What is 2+2?");
    
    // Immediately try to send a second message while first is processing
    // This should either be queued or the first should be aborted
    await sendMessage(page, "What is 3+3?");
    
    // Try to send a third message rapidly
    await sendMessage(page, "What is 4+4?");

    // Wait for the interface to stabilize
    await page.waitForTimeout(2000);

    // Verify all user messages are present
    await expect(page.locator('text=What is 2+2?')).toBeVisible();
    await expect(page.locator('text=What is 3+3?')).toBeVisible();
    await expect(page.locator('text=What is 4+4?')).toBeVisible();

    // Wait for at least one assistant response (the system should handle the concurrent requests gracefully)
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('p');
      // Should have at least 4 messages: 3 user + 1 assistant response
      return messages.length >= 4;
    }, { timeout: 30000 });

    // Verify that the final state is stable (no ongoing operations)
    const sendButton = page.locator('button[aria-label="Send"]');
    const abortButton = page.locator('button[aria-label="Abort"]');
    
    await expect(sendButton).toBeVisible();
    await expect(abortButton).not.toBeVisible();

    // Clean up: delete the test chat
    await page.goto("/chats");
    const deleteButton = page.locator(`a[href="/chats/${chatId}"]`).locator('..').locator('button:has-text("Delete")');
    await deleteButton.click();
    
    // Verify the chat is deleted
    await expect(page.locator(`a[href="/chats/${chatId}"]`)).not.toBeVisible();
  });

  test("should handle abort during rapid message sending", async ({ page }) => {
    // Go to chats page and create a new chat
    await page.goto("/chats");
    await page.click('button:has-text("Start a new AI chat")');
    await expect(page).toHaveURL(/\/chats\/[a-zA-Z0-9_-]+/);
    
    const chatUrl = page.url();
    const chatId = chatUrl.split('/').pop();

    // Send a message that should take some time to process
    await sendMessage(page, "Write a detailed explanation of quantum mechanics with examples.");

    // Wait for abort button to appear
    const abortButton = page.locator('button[aria-label="Abort"]');
    await expect(abortButton).toBeVisible({ timeout: 5000 });

    // Click abort
    await abortButton.click();

    // Verify we're back to send state
    const sendButton = page.locator('button[aria-label="Send"]');
    await expect(sendButton).toBeVisible({ timeout: 5000 });

    // Immediately send another message
    await sendMessage(page, "What is the capital of France?");

    // Wait for this new response
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('p');
      // Should have at least 3 messages: 2 user + 1 assistant response
      return messages.length >= 3;
    }, { timeout: 30000 });

    // Verify both user messages are present
    await expect(page.locator('text=Write a detailed explanation')).toBeVisible();
    await expect(page.locator('text=What is the capital of France?')).toBeVisible();

    // Verify the system is in a stable state
    await expect(sendButton).toBeVisible();
    await expect(abortButton).not.toBeVisible();

    // Clean up: delete the test chat
    await page.goto("/chats");
    const deleteButton = page.locator(`a[href="/chats/${chatId}"]`).locator('..').locator('button:has-text("Delete")');
    await deleteButton.click();
    await expect(page.locator(`a[href="/chats/${chatId}"]`)).not.toBeVisible();
  });

  test("should handle empty messages and text input validation", async ({ page }) => {
    // Go to chats page and create a new chat
    await page.goto("/chats");
    await page.click('button:has-text("Start a new AI chat")');
    await expect(page).toHaveURL(/\/chats\/[a-zA-Z0-9_-]+/);
    
    const chatUrl = page.url();
    const chatId = chatUrl.split('/').pop();

    const { textInput, sendButton } = await setupChatComposer(page);

    // Initially the button might be enabled or disabled - let's check what happens when we try to send empty
    const initialButtonState = await sendButton.isEnabled();
    
    if (initialButtonState) {
      // If button is enabled with empty text, clicking it should not send a message
      await sendButton.click();
      
      // Wait a moment and verify no message was added to the chat
      await page.waitForTimeout(1000);
      const messageCount = await page.locator('p').count();
      expect(messageCount).toBe(0); // No messages should be present
    }

    // Add some text - button should be enabled
    await textInput.fill("Hello world!");
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify the message was sent
    await expect(page.locator('text=Hello world!')).toBeVisible();

    // Try sending whitespace-only message
    await textInput.clear();
    await textInput.fill("   ");
    
    // Even if button is enabled, clicking shouldn't send whitespace-only message
    if (await sendButton.isEnabled()) {
      await sendButton.click();
      await page.waitForTimeout(1000);
      
      // Should still only have 1 user message (the "Hello world!" one)
      const userMessages = await page.locator('p').count();
      expect(userMessages).toBeLessThanOrEqual(2); // 1 user message + possibly 1 assistant response
    }

    // Clean up: delete the test chat
    await page.goto("/chats");
    const deleteButton = page.locator(`a[href="/chats/${chatId}"]`).locator('..').locator('button:has-text("Delete")');
    await deleteButton.click();
    await expect(page.locator(`a[href="/chats/${chatId}"]`)).not.toBeVisible();
  });
});