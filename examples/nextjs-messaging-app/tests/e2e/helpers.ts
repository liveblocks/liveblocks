import { expect, type Browser, type Locator, type Page } from "@playwright/test";

// The demo users in `app/database.ts`, in `examplePreview` order
export const USERS = [
  { index: 0, id: "charlie.layne@example.com", name: "Charlie Layne" },
  { index: 1, id: "mislav.abha@example.com", name: "Mislav Abha" },
  { index: 2, id: "tatum.paolo@example.com", name: "Tatum Paolo" },
  { index: 3, id: "anjali.wanda@example.com", name: "Anjali Wanda" },
  { index: 4, id: "quinn.elton@example.com", name: "Quinn Elton" },
] as const;

export type DemoUser = (typeof USERS)[number];
export const [CHARLIE, MISLAV, TATUM] = USERS;

export const AI_NAME = "Liveblocks AI";
export const DEFAULT_CHANNELS = [
  "general",
  "random",
  "engineering",
  "design",
  "marketing",
];

// Whether the suite is talking to the local dev server. Its REST feed
// endpoints are stubs, so flows that go through `/api/ai-reply` only work
// against the cloud backend.
export const IS_LOCAL_BACKEND =
  (process.env.E2E_BACKEND ?? (process.env.LIVEBLOCKS_DEV_SERVER_PORT ? "local" : "cloud")) ===
  "local";

// Every test gets its own rooms: the app suffixes room ids with `exampleId`.
export function uniqueExampleId(label = "e2e") {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueText(label: string) {
  return `${label} ${Math.random().toString(36).slice(2, 8)}`;
}

// Opens the app as a given demo user inside an isolated set of rooms and
// waits until the default channel is on screen.
export async function openApp(
  page: Page,
  { exampleId, user }: { exampleId: string; user: DemoUser }
) {
  const params = new URLSearchParams({
    exampleId,
    examplePreview: String(user.index),
  });
  await page.goto(`/?${params}`);
  await expect(channelHeading(page, "general")).toBeVisible({ timeout: 30_000 });
  await expect(composer(page)).toBeVisible();
}

// A second user in their own browser context (separate storage + socket)
export async function openAppAs(
  browser: Browser,
  options: { exampleId: string; user: DemoUser }
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openApp(page, options);
  return { context, page };
}

// ---------------------------------------------------------------------------
// Locators

export function rail(page: Page) {
  return page.getByRole("navigation");
}

export function railItem(page: Page, label: "Home" | "DMs" | "Activity") {
  // The unread badge is part of the accessible name ("2 unread DMs")
  return rail(page).getByRole("button", { name: new RegExp(`${label}$`) });
}

export function sidebar(page: Page) {
  return page.getByRole("complementary").first();
}

export function channelHeading(page: Page, name: string) {
  return page.getByRole("heading", { name: `#${name}`, exact: true });
}

// The conversation header (the intro below repeats the name in an h3)
export function dmHeading(page: Page, userName: string) {
  return page.getByRole("heading", { name: userName, exact: true }).first();
}

// The name + status line of a DM header ("Online", "Offline" or "Agent")
export function dmHeaderStatus(page: Page, userName: string) {
  return dmHeading(page, userName).locator("..");
}

export function channelRow(page: Page, name: string) {
  return sidebar(page).getByRole("button", { name: `#${name}`, exact: true });
}

export function dmRow(page: Page, userName: string) {
  // The accessible name also picks up the presence dot's label and, in the
  // detailed list, the preview text, so match loosely on the name.
  return sidebar(page)
    .getByRole("button", { name: new RegExp(userName) })
    .first();
}

export function composer(page: Page, scope: Locator | Page = page) {
  return scope.locator(".composer-editor[contenteditable='true']").last();
}

export function threadPanel(page: Page) {
  return page.getByRole("complementary").filter({
    has: page.getByRole("heading", { name: "Thread", exact: true }),
  });
}

export function messageByText(page: Page, text: string, scope: Locator | Page = page) {
  return scope.locator("[data-message-id]").filter({ hasText: text }).first();
}

export function activityRows(page: Page) {
  return sidebar(page).getByRole("listitem");
}

// ---------------------------------------------------------------------------
// Actions

export async function openView(page: Page, label: "Home" | "DMs" | "Activity") {
  await railItem(page, label).click();
  await expect(railItem(page, label)).toHaveAttribute("aria-current", "page");
}

export async function selectChannel(page: Page, name: string) {
  await openView(page, "Home");
  await channelRow(page, name).click();
  await expect(channelHeading(page, name)).toBeVisible();
}

export async function openDm(page: Page, userName: string) {
  await openView(page, "Home");
  await dmRow(page, userName).click();
  await expect(dmHeading(page, userName)).toBeVisible();
}

// Types into the active composer and presses Enter. Pass `scope` to target
// the thread panel's composer instead of the conversation's.
export async function sendMessage(
  page: Page,
  text: string,
  scope: Locator | Page = page
) {
  const editor = composer(page, scope);
  await editor.click();
  await editor.pressSequentially(text);
  await editor.press("Enter");
  await expect(messageByText(page, text, scope)).toBeVisible();
}

// Types `@` + a query, picks the first suggestion, then types the rest.
export async function sendMessageWithMention(
  page: Page,
  { before = "", mention, after = "" }: { before?: string; mention: string; after?: string },
  scope: Locator | Page = page
) {
  const editor = composer(page, scope);
  await editor.click();
  if (before) {
    await editor.pressSequentially(before);
  }
  await editor.pressSequentially(`@${mention}`);
  // The highlighted suggestion is the one Enter will pick
  const suggestion = page.locator("button.bg-brand-500", { hasText: mention });
  await expect(suggestion).toBeVisible();
  await editor.press("Enter");
  // The mention renders as a chip inside the editor
  await expect(editor.locator(".mention")).toHaveCount(1);
  if (after) {
    await editor.pressSequentially(after);
  }
  await editor.press("Enter");
}

export async function openThreadFor(page: Page, messageText: string) {
  const message = messageByText(page, messageText);
  // If the thread already has replies, remember how many so we can wait for
  // them: the panel shows a loading state with its own composer first, and
  // keystrokes typed into that one are lost when the real one mounts.
  const pill = message.getByRole("button", { name: /\d+ repl/ });
  const pillText = (await pill.count()) > 0 ? await pill.textContent() : null;
  const replyCount = pillText?.match(/(\d+) repl/)?.[1];

  await message.hover();
  await message.getByRole("button", { name: "Reply in thread" }).click();
  const panel = threadPanel(page);
  await expect(panel).toBeVisible();
  if (replyCount) {
    await expect(
      panel.getByText(new RegExp(`^${replyCount} repl`))
    ).toBeVisible();
  }
  return panel;
}

export async function unreadCount(locator: Locator) {
  const badge = locator.getByLabel(/unread$/);
  if ((await badge.count()) === 0) {
    return 0;
  }
  const text = (await badge.first().textContent()) ?? "0";
  return Number.parseInt(text, 10);
}

export async function expectUnread(locator: Locator, count: number) {
  if (count === 0) {
    await expect(locator.getByLabel(/unread$/)).toHaveCount(0);
  } else {
    await expect(locator.getByLabel(`${count} unread`)).toBeVisible();
  }
}

export async function expectHighlighted(message: Locator) {
  await expect(message).toHaveClass(/bg-yellow-50/);
}
