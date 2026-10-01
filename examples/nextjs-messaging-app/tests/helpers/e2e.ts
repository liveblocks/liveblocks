import {
  expect,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

export const USERS = [
  { index: 0, id: "charlie.layne@example.com", name: "Charlie Layne" },
  { index: 1, id: "mislav.abha@example.com", name: "Mislav Abha" },
  { index: 2, id: "tatum.paolo@example.com", name: "Tatum Paolo" },
  { index: 3, id: "anjali.wanda@example.com", name: "Anjali Wanda" },
  { index: 4, id: "quinn.elton@example.com", name: "Quinn Elton" },
] as const;

export type DemoUser = (typeof USERS)[number];
export const [CHARLIE, MISLAV, TATUM] = USERS;

export const AI_USER = { id: "ai-assistant", name: "Liveblocks AI" } as const;
export const AI_NAME = AI_USER.name;

export type DmTarget = Pick<DemoUser | typeof AI_USER, "id" | "name">;
export const DEFAULT_CHANNELS = [
  "general",
  "random",
  "engineering",
  "design",
  "marketing",
];

export const IS_LOCAL_BACKEND =
  (process.env.E2E_BACKEND ??
    (process.env.LIVEBLOCKS_DEV_SERVER_PORT ? "local" : "cloud")) === "local";

export function uniqueExampleId(label = "e2e") {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueText(label: string) {
  return `${label} ${Math.random().toString(36).slice(2, 8)}`;
}

export async function openApp(
  page: Page,
  { exampleId, user }: { exampleId: string; user: DemoUser }
) {
  const params = new URLSearchParams({
    exampleId,
    examplePreview: String(user.index),
  });
  await page.goto(`/?${params}`);
  await expect(channelHeading(page, "general")).toBeVisible({
    timeout: 30_000,
  });
  await expect(composer(page)).toBeVisible();
}

export async function openAppAs(
  browser: Browser,
  options: { exampleId: string; user: DemoUser }
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openApp(page, options);
  return { context, page };
}

export function rail(page: Page) {
  return page.getByRole("navigation");
}

export function railItem(page: Page, label: "Home" | "DMs" | "Activity") {
  return rail(page).getByRole("button", { name: new RegExp(`${label}$`) });
}

export function sidebar(page: Page) {
  return page.getByRole("complementary", { name: "Sidebar" });
}

export function conversation(page: Page) {
  return page.getByRole("region", { name: "Conversation" });
}

export function threadPanel(page: Page) {
  return page.getByRole("complementary", { name: "Thread" });
}

export function channelHeading(page: Page, name: string) {
  return conversation(page).getByRole("heading", {
    name: `#${name}`,
    exact: true,
    level: 2,
  });
}

export function dmHeading(page: Page, user: DmTarget) {
  return conversation(page).getByRole("heading", {
    name: user.name,
    exact: true,
    level: 2,
  });
}

export function dmHeaderStatus(page: Page, user: DmTarget) {
  return dmHeading(page, user).locator("..");
}

export function channelRow(page: Page, name: string) {
  return sidebar(page).getByRole("button", { name: `#${name}`, exact: true });
}

export function dmRow(page: Page, user: DmTarget) {
  return sidebar(page)
    .locator(`[data-user-id="${user.id}"]`)
    .getByRole("button");
}

export function composer(page: Page, scope: Locator = conversation(page)) {
  return scope.locator(".composer-editor[contenteditable='true']");
}

export function messageByText(
  page: Page,
  text: string,
  scope: Locator = conversation(page)
) {
  return scope.locator("[data-message-id]").filter({ hasText: text });
}

export function activityRows(page: Page) {
  return sidebar(page).getByRole("listitem");
}

export function activeRowButton(row: Locator) {
  return row.locator("button[aria-current='true']");
}

export async function openView(page: Page, label: "Home" | "DMs" | "Activity") {
  await railItem(page, label).click();
  await expect(railItem(page, label)).toHaveAttribute("aria-current", "page");
}

export async function selectChannel(page: Page, name: string) {
  await openView(page, "Home");
  await channelRow(page, name).click();
  await expect(channelHeading(page, name)).toBeVisible();
}

export async function openDm(page: Page, user: DmTarget) {
  await openView(page, "Home");
  await dmRow(page, user).click();
  await expect(dmHeading(page, user)).toBeVisible();
}

export async function sendMessage(
  page: Page,
  text: string,
  scope: Locator = conversation(page)
) {
  const editor = composer(page, scope);
  await editor.click();
  await editor.pressSequentially(text);
  await editor.press("Enter");
  await expect(messageByText(page, text, scope)).toBeVisible();
}

export async function sendMessageWithMention(
  page: Page,
  {
    before = "",
    mention,
    after = "",
  }: { before?: string; mention: string; after?: string },
  scope: Locator = conversation(page)
) {
  const editor = composer(page, scope);
  await editor.click();
  if (before) {
    await editor.pressSequentially(before);
  }
  await editor.pressSequentially(`@${mention}`);
  const suggestion = page.locator("button.bg-brand-500", { hasText: mention });
  await expect(suggestion).toBeVisible();
  await editor.press("Enter");
  await expect(editor.locator(".mention")).toHaveCount(1);
  if (after) {
    await editor.pressSequentially(after);
  }
  await editor.press("Enter");
}

export async function openThreadFor(page: Page, messageText: string) {
  const message = messageByText(page, messageText);
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
