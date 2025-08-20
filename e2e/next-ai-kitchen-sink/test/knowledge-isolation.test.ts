import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function setupChatA(page: Page) {
  const textInput = page.locator(
    '[data-testid="chat-a"] .lb-ai-composer-editor'
  );
  const sendButton = page.locator(
    '[data-testid="chat-a"] .lb-ai-composer-action'
  );

  // If there's an ongoing operation (abort button is enabled), click it first to clear state
  if ((await sendButton.getAttribute("aria-label")) === "Abort response") {
    await sendButton.click();
    // Wait for it to return to send state
    await expect(sendButton).toHaveAttribute("aria-label", "Send");
  }

  // Clear any existing text
  await textInput.clear();

  return { textInput, sendButton };
}

async function setupChatB(page: Page) {
  const textInput = page.locator(
    '[data-testid="chat-b"] .lb-ai-composer-editor'
  );
  const sendButton = page.locator(
    '[data-testid="chat-b"] .lb-ai-composer-action'
  );

  // If there's an ongoing operation (abort button is enabled), click it first to clear state
  if ((await sendButton.getAttribute("aria-label")) === "Abort response") {
    await sendButton.click();
    // Wait for it to return to send state
    await expect(sendButton).toHaveAttribute("aria-label", "Send");
  }

  // Clear any existing text
  await textInput.clear();

  return { textInput, sendButton };
}

async function sendMessageToChatA(page: Page, message: string) {
  const { textInput, sendButton } = await setupChatA(page);

  await textInput.fill(message);
  await sendButton.click({ timeout: 5000 });

  // Verify the message was sent (appears in chat A)
  await expect(
    page.locator('[data-testid="chat-a"]').locator(`text=${message}`)
  ).toBeVisible();

  // Wait for generation to finish by monitoring button state change
  // Button should become "Abort response" during generation, then back to "Send"
  await expect(sendButton).toHaveAttribute("aria-label", "Abort response", {
    timeout: 10000,
  });
  await expect(sendButton).toHaveAttribute("aria-label", "Send", {
    timeout: 60000,
  });
}

async function sendMessageToChatB(page: Page, message: string) {
  const { textInput, sendButton } = await setupChatB(page);

  await textInput.fill(message);
  await sendButton.click({ timeout: 5000 });

  // Verify the message was sent (appears in chat B)
  await expect(
    page.locator('[data-testid="chat-b"]').locator(`text=${message}`)
  ).toBeVisible();

  // Wait for generation to finish by monitoring button state change
  // Button should become "Abort response" during generation, then back to "Send"
  await expect(sendButton).toHaveAttribute("aria-label", "Abort response", {
    timeout: 10000,
  });
  await expect(sendButton).toHaveAttribute("aria-label", "Send", {
    timeout: 60000,
  });
}

test.describe("AiChat Knowledge Isolation", () => {
  test.beforeEach(async ({ page }) => {
    // Clean up existing chats
    await page.goto("/chats");
    await expect(page.locator("h1")).toHaveText("List of all chats");

    // Delete chat-a if it exists
    const chatALink = page.locator('a[href="/chats/chat-a"]');
    if (await chatALink.isVisible()) {
      const deleteButton = chatALink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(chatALink).not.toBeVisible();
    }

    // Delete chat-b if it exists
    const chatBLink = page.locator('a[href="/chats/chat-b"]');
    if (await chatBLink.isVisible()) {
      const deleteButton = chatBLink
        .locator("..")
        .locator('button:has-text("Delete")');
      await deleteButton.click();
      await expect(chatBLink).not.toBeVisible();
    }
  });

  test("should NOT share knowledge between separate AiChat instances", async ({
    page,
  }) => {
    // Go to the dual chat page
    await page.goto("/dual-chat");

    // Wait for the page title and both chats to be visible
    await expect(
      page.locator('h1:has-text("Knowledge Isolation Test")')
    ).toBeVisible();
    await expect(page.locator('h2:has-text("Chat A")')).toBeVisible();
    await expect(page.locator('h2:has-text("Chat B")')).toBeVisible();

    // Verify the default pasta knowledge is set
    const knowledgeInput = page.locator(
      '[data-testid="chat-a-knowledge-input"]'
    );
    await expect(knowledgeInput).toHaveValue("Spaghetti Carbonara");

    // Wait for the AiChat components to be fully loaded
    await expect(
      page.locator('[data-testid="chat-a"] .lb-ai-composer')
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="chat-b"] .lb-ai-composer')
    ).toBeVisible({
      timeout: 10000,
    });

    // Ask both chats about favorite pasta - only one should know it
    await sendMessageToChatA(page, "What's my favorite pasta?");
    await sendMessageToChatB(page, "What's my favorite pasta?");

    // Wait for Chat A's response containing the pasta name
    await expect(
      page.locator('[data-testid="chat-a"]').locator("text=Spaghetti Carbonara")
    ).toBeVisible({ timeout: 10000 });

    // Get Chat B's assistant response text and verify it doesn't include "Spaghetti Carbonara"
    const chatBAssistantMessage = page
      .locator('[data-testid="chat-b"] .lb-ai-chat-assistant-message')
      .last();
    const chatBText = await chatBAssistantMessage.textContent();
    expect(chatBText).not.toContain("Spaghetti Carbonara");
  });

  test("should isolate different knowledge values between chats", async ({
    page,
  }) => {
    await page.goto("/dual-chat");

    // Wait for the page title to be visible
    await expect(
      page.locator('h1:has-text("Knowledge Isolation Test")')
    ).toBeVisible();

    // Wait for components to load
    await expect(
      page.locator('[data-testid="chat-a"] .lb-ai-composer')
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="chat-b"] .lb-ai-composer')
    ).toBeVisible({
      timeout: 10000,
    });

    // Change the pasta knowledge for Chat A
    const knowledgeInput = page.locator(
      '[data-testid="chat-a-knowledge-input"]'
    );
    await knowledgeInput.clear();
    await knowledgeInput.fill("Penne Arrabiata");

    // Ask Chat A about favorite pasta
    await sendMessageToChatA(page, "What's my favorite pasta?");

    // Chat A should know the pasta is Penne Arrabiata
    await expect(
      page.locator('[data-testid="chat-a"]').locator("text=Penne Arrabiata")
    ).toBeVisible({ timeout: 30000 });

    // Ask Chat B about favorite pasta
    await sendMessageToChatB(page, "What's my favorite pasta?");

    // Get Chat B's assistant response text and verify it doesn't include "Penne Arrabiata"
    // This test should FAIL with the current bug
    const chatBAssistantMessage = page
      .locator('[data-testid="chat-b"] .lb-ai-chat-assistant-message')
      .last();
    const chatBText = await chatBAssistantMessage.textContent();
    expect(chatBText).not.toContain("Penne Arrabiata");
  });

  test("should SHARE knowledge when using RegisterAiKnowledge globally", async ({
    page,
  }) => {
    // Go to the dual chat page (now contains both local and global knowledge testing)
    await page.goto("/dual-chat");

    // Wait for the page title and both chats to be visible
    await expect(
      page.locator('h1:has-text("Knowledge Isolation Test")')
    ).toBeVisible();
    await expect(page.locator('h2:has-text("Chat A")')).toBeVisible();
    await expect(page.locator('h2:has-text("Chat B")')).toBeVisible();

    // Verify the default global knowledge is set
    const globalKnowledgeInput = page.locator(
      '[data-testid="global-knowledge-input"]'
    );
    await expect(globalKnowledgeInput).toHaveValue("Tiramisu");

    // Wait for the AiChat components to be fully loaded
    await expect(
      page.locator('[data-testid="chat-a"] .lb-ai-composer')
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="chat-b"] .lb-ai-composer')
    ).toBeVisible({
      timeout: 10000,
    });

    // Ask Chat A about the global knowledge - it should have access to both local and global
    await sendMessageToChatA(page, "What dessert do I like?");

    // Wait for Chat A's response containing the global knowledge
    await expect(
      page
        .locator('[data-testid="chat-a"] .lb-ai-chat-assistant-message')
        .last()
        .locator("text=Tiramisu")
    ).toBeVisible({ timeout: 30000 });

    // Ask Chat B about the same global knowledge - it should ALSO have access
    await sendMessageToChatB(page, "What dessert do I like?");

    // Chat B should ALSO have access to the global knowledge
    await expect(
      page
        .locator('[data-testid="chat-b"] .lb-ai-chat-assistant-message')
        .last()
        .locator("text=Tiramisu")
    ).toBeVisible({ timeout: 30000 });

    // Change the global knowledge
    await globalKnowledgeInput.clear();
    await globalKnowledgeInput.fill("Gelato");

    // Ask both chats again - they should both know the new global knowledge
    await sendMessageToChatA(page, "What dessert do I like now?");
    await sendMessageToChatB(page, "What dessert do I like now?");

    // Both chats should have access to the updated global knowledge
    await expect(
      page
        .locator('[data-testid="chat-a"] .lb-ai-chat-assistant-message')
        .last()
        .locator("text=Gelato")
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page
        .locator('[data-testid="chat-b"] .lb-ai-chat-assistant-message')
        .last()
        .locator("text=Gelato")
    ).toBeVisible({ timeout: 30000 });
  });
});
