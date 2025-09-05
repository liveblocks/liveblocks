import { expect, type Page } from "@playwright/test";
import { nanoid } from "@liveblocks/core";

// Store cleanup functions per test - using a simple array since we can't use test.info()
const registry: Array<() => Promise<void>> = [];

/**
 * Creates a unique random chat ID with date prefix and registers cleanup.
 * Call `cleanupAllChats()` in your test's try/finally block or afterEach hook.
 */
export function createRandomChat(page: Page): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const chatId = `${today}-${nanoid(8)}`; // Use shorter 8-char nanoid

  const cleanupFn = async () => {
    try {
      await page.goto(`/cleanup/${chatId}`, { waitUntil: "networkidle" });
      // Wait for the deletion to complete - should show "Chat deleted" on success
      await expect(page.locator("text=Chat deleted")).toBeVisible({
        timeout: 10000,
      });
    } catch (error) {
      console.warn(`Failed to cleanup chat ${chatId}:`, error);
    }
  };

  registry.push(cleanupFn);
  return chatId;
}

/**
 * Cleans up all chats created with createRandomChat().
 * Call this in your test.afterEach() hook.
 */
export async function cleanupAllChats(): Promise<void> {
  let cleanupFn: (() => Promise<void>) | undefined;
  while ((cleanupFn = registry.pop())) {
    try {
      await cleanupFn();
    } catch (error) {
      console.warn("Failed to cleanup chat:", error);
    }
  }
}
