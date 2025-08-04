import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function setupChatComposer(page: Page) {
  // Wait for the chat interface to load (based on the AiChatComposer structure)
  await expect(page.locator('[role="textbox"]')).toBeVisible({ timeout: 10000 });

  // Find the text input (contenteditable div) and send button
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

test.describe("Multi Chat", () => {
  test("should create multiple chats, get responses, auto-generate titles, and cleanup", async ({ page }) => {
    // Start at the chats index page
    await page.goto("/chats");
    
    // Wait for the page to load
    await expect(page.locator("h1")).toHaveText("List of all chats");

    // Create first chat
    await page.click('button:has-text("Start a new AI chat")');
    
    // We should be redirected to a new chat page
    await expect(page).toHaveURL(/\/chats\/[a-zA-Z0-9_-]+/);
    const firstChatUrl = page.url();
    const firstChatId = firstChatUrl.split('/').pop();

    // Send a message in the first chat
    const { textInput: firstTextInput, sendButton: firstSendButton } = await setupChatComposer(page);
    await firstTextInput.fill("What is machine learning?");
    await firstSendButton.click();

    // Verify the message was sent (optimistically created)
    await expect(page.locator('text=What is machine learning?')).toBeVisible();

    // Go back to chats index and create second chat
    await page.goto("/chats");
    await page.click('button:has-text("Start a new AI chat")');
    
    // We should be redirected to another new chat page
    await expect(page).toHaveURL(/\/chats\/[a-zA-Z0-9_-]+/);
    const secondChatUrl = page.url();
    const secondChatId = secondChatUrl.split('/').pop();
    
    // Ensure it's a different chat
    expect(secondChatId).not.toBe(firstChatId);

    // Send a message in the second chat
    const { textInput: secondTextInput, sendButton: secondSendButton } = await setupChatComposer(page);
    await secondTextInput.fill("Explain quantum computing.");
    await secondSendButton.click();

    // Verify the message was sent
    await expect(page.locator('text=Explain quantum computing.')).toBeVisible();

    // Go back to first chat and wait for assistant response
    await page.goto(firstChatUrl);
    
    // Wait for assistant response in first chat (should have at least 2 messages - user + assistant)
    await expect(page.locator('[role="textbox"]')).toBeVisible(); // Wait for page to load
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('p'); // Messages are in <p> tags
      return messages.length >= 2; // At least user message + assistant response
    }, { timeout: 30000 });

    // Go back to second chat and wait for assistant response  
    await page.goto(secondChatUrl);
    
    // Wait for assistant response in second chat
    await expect(page.locator('[role="textbox"]')).toBeVisible(); // Wait for page to load
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('p');
      return messages.length >= 2; // At least user message + assistant response
    }, { timeout: 30000 });

    // Go back to index page to check auto-generated titles
    await page.goto("/chats");
    
    // Wait for titles to be generated (they should no longer be "Untitled")
    // Look for links that are not "Untitled" and contain our chat IDs
    await expect(page.locator(`a[href="/chats/${firstChatId}"]`).filter({ hasNotText: 'Untitled' })).toBeVisible({ timeout: 30000 });
    await expect(page.locator(`a[href="/chats/${secondChatId}"]`).filter({ hasNotText: 'Untitled' })).toBeVisible({ timeout: 30000 });

    // Verify the titles are related to the content
    const firstChatLink = page.locator(`a[href="/chats/${firstChatId}"]`);
    const secondChatLink = page.locator(`a[href="/chats/${secondChatId}"]`);
    
    const firstTitle = await firstChatLink.textContent();
    const secondTitle = await secondChatLink.textContent();
    
    // Titles should be meaningful and related to the questions asked
    expect(firstTitle?.toLowerCase()).toMatch(/machine|learning|ml/);
    expect(secondTitle?.toLowerCase()).toMatch(/quantum|computing/);

    // Clean up: delete both chats
    // Find and click delete buttons for our chats
    const firstDeleteButton = page.locator(`a[href="/chats/${firstChatId}"]`).locator('..').locator('button:has-text("Delete")');
    const secondDeleteButton = page.locator(`a[href="/chats/${secondChatId}"]`).locator('..').locator('button:has-text("Delete")');
    
    await firstDeleteButton.click();
    await secondDeleteButton.click();

    // Verify the chats are no longer in the list
    await expect(page.locator(`a[href="/chats/${firstChatId}"]`)).not.toBeVisible();
    await expect(page.locator(`a[href="/chats/${secondChatId}"]`)).not.toBeVisible();
  });
});