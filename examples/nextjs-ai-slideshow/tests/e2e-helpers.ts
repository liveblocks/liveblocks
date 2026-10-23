import { expect, type Page } from "@playwright/test";

export function uniqueRoomUrl(name: string) {
  const id = `${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return `/?exampleId=${id}`;
}

export async function openSlideshow(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  await expect(page.getByText("Slide 1", { exact: true })).toBeVisible();
  return page;
}

export function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Slide preview"]');
}

export function thumbnails(page: Page) {
  return page.locator('iframe[title$="thumbnail"]');
}

export const STARTER_HEADLINE = "Move elements, edit code, chat to AI.";
export const EMPTY_SLIDE_HEADLINE = "Get started by chatting to AI";
export const CLOUD_ONLY =
  "Needs the Liveblocks cloud backend (Comments and Feeds are stubs in the local dev server). Run with LIVEBLOCKS_CLOUD=1 and real keys.";
