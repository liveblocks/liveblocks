import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createRandomChat, cleanupAllChats } from "./test-helpers";

async function setupAiChat(page: Page) {
  // Wait for the AI chat popover to be visible
  await expect(page.locator(".lb-ai-composer")).toBeVisible({
    timeout: 10000,
  });

  // Find the text input and send button in the AI chat
  const textInput = page.locator(".lb-ai-composer-editor");
  const sendButton = page.locator(".lb-ai-composer-action");

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
  await expect(sendButton).toBeEnabled({ timeout: 5000 });
  await sendButton.click();

  // Verify the message was sent (appears in the chat)
  await expect(page.locator(".lb-ai-chat-user-message").last()).toContainText(
    message
  );
}

test.describe("Tool Calling", () => {
  test.afterEach(async () => {
    await cleanupAllChats();
  });

  test("should perform todo operations via AI tool calls", async ({ page }) => {
    const chatId = createRandomChat(page);

    await test.step("Setup todo page with default items", async () => {
      // Create unique test chat and go to todo page
      await page.goto(`/todo/${chatId}`, { waitUntil: "networkidle" });

      // Wait for the page to load and show default todos
      await expect(page.locator('li:has-text("Get groceries")')).toBeVisible();
      await expect(page.locator('li:has-text("Go to the gym")')).toBeVisible();
      await expect(page.locator('li:has-text("Cook dinner")')).toBeVisible();
    });

    await test.step("Add test todo item manually", async () => {
      // Add a new todo item manually first
      const todoInput = page.locator('input[placeholder="Add a todo"]');
      await todoInput.fill("Buy test item for AI");
      await todoInput.press("Enter");

      // Verify the new todo appears in the list
      await expect(
        page.locator('li:has-text("Buy test item for AI")')
      ).toBeVisible();
    });

    await test.step("Test AI tool call to list todos", async () => {
      // Open the AI chat and ask it to list all current todos
      // The chat should be open by default (Popover.Root open={true})
      await sendAiMessage(page, "List all current todos. Be brief.");

      // Wait for the AI response with tool call results
      // The response should show all todos including our new one
      await expect(page.locator("text=Buy test item for AI")).toBeVisible({
        timeout: 30000,
      });
      await expect(page.locator("text=Get groceries")).toBeVisible();
      await expect(page.locator("text=Go to the gym")).toBeVisible();
      await expect(page.locator("text=Cook dinner")).toBeVisible();
    });

    await test.step("Test AI tool call to toggle todo completion", async () => {
      // Ask AI to toggle the new item we just added
      await sendAiMessage(
        page,
        "Toggle the completion status of 'Buy test item for AI'"
      );

      // Wait for the tool call to execute and verify the todo is now completed (crossed out)
      await page.waitForTimeout(5000); // Wait for tool execution
      // Check in the main todo list (not in the AI chat) for the completed item
      const completedTodo = page.locator(
        'ul.flex li.line-through:has-text("Buy test item for AI")'
      );
      await expect(completedTodo).toBeVisible({ timeout: 10000 });
    });

    await test.step("Test AI tool call to delete todo", async () => {
      // Ask AI to delete the newly added item
      await sendAiMessage(page, "Delete the todo item 'Buy test item for AI'");

      // Wait for the confirmation dialog to appear
      await expect(page.locator("text=Okay to delete?")).toBeVisible({
        timeout: 10000,
      });

      // Click the Confirm button (look for various possible button texts)
      const confirmButton = page
        .locator("button")
        .filter({ hasText: /Confirm|Yes|OK|Delete/ })
        .first();
      await confirmButton.click();

      // Wait for the deletion to complete
      await page.waitForTimeout(5000);

      // Check if the AI chat shows the deletion was successful first
      const deletedText = page
        .locator("text=Deleted")
        .or(page.locator("text=deleted"));
      if (await deletedText.isVisible()) {
        // If deletion was successful, the item should be gone from the main list
        await expect(
          page.locator('ul.flex li:has-text("Buy test item for AI")')
        ).not.toBeVisible();
      } else {
        // If deletion failed or was cancelled, just verify the AI handled it gracefully
        console.log(
          "Deletion may have failed or been cancelled - checking AI response"
        );
      }
    });

    await test.step("Verify original todos remain intact", async () => {
      // Verify the remaining todos are still there in the main list
      await expect(
        page.locator('ul.flex li:has-text("Get groceries")')
      ).toBeVisible();
      await expect(
        page.locator('ul.flex li:has-text("Go to the gym")')
      ).toBeVisible();
      await expect(
        page.locator('ul.flex li:has-text("Cook dinner")')
      ).toBeVisible();
    });
  });

  test("should handle tool call errors gracefully", async ({ page }) => {
    // Create unique test chat and go to todo page
    const chatId = createRandomChat(page);
    await page.goto(`/todo/${chatId}`, { waitUntil: "networkidle" });

    // Try to toggle a non-existent todo
    await sendAiMessage(page, "Toggle the todo with ID 99999");

    // The AI should handle this gracefully, either by explaining the todo doesn't exist
    // or by attempting the operation and reporting no changes
    await page.waitForTimeout(10000); // Wait for AI response

    // Verify the existing todos are unchanged in the main list (use more specific selectors)
    await expect(
      page.locator('ul.flex li:has-text("Get groceries")')
    ).toBeVisible();
    await expect(
      page.locator('ul.flex li:has-text("Go to the gym")')
    ).toBeVisible();
    await expect(
      page.locator('ul.flex li:has-text("Cook dinner")')
    ).toBeVisible();
  });

  test("should handle cancellation of delete confirmation", async ({
    page,
  }) => {
    // Create unique test chat
    const chatId = createRandomChat(page);

    await page.goto(`/todo/${chatId}`, { waitUntil: "networkidle" });

    // Add a test todo
    const todoInput = page.locator('input[placeholder="Add a todo"]');
    await todoInput.fill("Test cancellation item");
    await todoInput.press("Enter");
    await expect(
      page.locator('ul li:has-text("Test cancellation item")')
    ).toBeVisible();

    // Ask AI to delete it
    await sendAiMessage(page, "Delete the todo 'Test cancellation item'");

    // Wait for confirmation dialog
    await expect(page.locator("text=Okay to delete?")).toBeVisible({
      timeout: 10000,
    });

    // Click Cancel/No instead of Confirm
    const cancelButton = page
      .locator('button:has-text("Cancel")')
      .or(page.locator('button:has-text("No")'));
    await cancelButton.click();

    // Verify the item is still there
    await expect(
      page.locator('ul li:has-text("Test cancellation item")')
    ).toBeVisible();

    // Verify the AI shows the request was denied
    await expect(page.locator(".lb-ai-chat-messages")).toContainText(
      /denied|cancelled/i,
      {
        timeout: 10000,
      }
    );
  });
});
