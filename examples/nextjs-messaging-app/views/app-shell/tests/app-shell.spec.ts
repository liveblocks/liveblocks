import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  AI_NAME,
  CHARLIE,
  DEFAULT_CHANNELS,
  MISLAV,
  USERS,
  channelHeading,
  channelRow,
  dmRow,
  openApp,
  openThreadFor,
  openView,
  rail,
  railItem,
  sendMessage,
  sidebar,
  uniqueExampleId,
  uniqueText,
} from "@/tests/helpers/e2e";

async function dragHandle(page: Page, handle: Locator, deltaX: number) {
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error("Resize handle is not visible");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX / 2, y, { steps: 4 });
  await page.mouse.move(x + deltaX, y, { steps: 4 });
  await page.mouse.up();
}

test.describe("app shell", () => {
  test("loads with the five default channels and #general open", async ({
    page,
  }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    for (const name of DEFAULT_CHANNELS) {
      await expect(channelRow(page, name)).toBeVisible();
    }
    await expect(channelHeading(page, "general")).toBeVisible();
    await expect(page.getByText("Welcome to #general")).toBeVisible();

    const names = await sidebar(page)
      .getByRole("button", { name: /^#/ })
      .allTextContents();
    expect(names.map((name) => name.replace(/^#\s*/, ""))).toEqual(
      DEFAULT_CHANNELS
    );
  });

  test("rail switches between Home, DMs and Activity", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await expect(railItem(page, "Home")).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(
      sidebar(page).getByText("Channels", { exact: true })
    ).toBeVisible();

    await openView(page, "DMs");
    await expect(
      sidebar(page).getByRole("heading", { name: "Direct messages" })
    ).toBeVisible();
    await expect(channelRow(page, "general")).toHaveCount(0);
    for (const user of USERS.filter((u) => u.id !== CHARLIE.id)) {
      await expect(dmRow(page, user.name)).toBeVisible();
    }
    await expect(dmRow(page, AI_NAME)).toBeVisible();
    await expect(
      sidebar(page).getByText("No messages yet").first()
    ).toBeVisible();

    await openView(page, "Activity");
    await expect(
      sidebar(page).getByRole("heading", { name: "Activity" })
    ).toBeVisible();
    await expect(sidebar(page).getByText("Nothing here yet")).toBeVisible();

    await expect(channelHeading(page, "general")).toBeVisible();
  });

  test("the home list shows direct messages under the channels", async ({
    page,
  }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await expect(
      sidebar(page).getByText("Direct messages", { exact: true })
    ).toBeVisible();
    await expect(dmRow(page, MISLAV.name)).toBeVisible();
    await expect(dmRow(page, CHARLIE.name)).toHaveCount(0);
    await expect(dmRow(page, AI_NAME)).toContainText("Agent");
  });

  test("switches the signed-in user from the rail", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await rail(page)
      .getByRole("button", {
        name: `Signed in as ${CHARLIE.name}. Switch user`,
      })
      .click();
    await page.getByRole("option", { name: MISLAV.name }).click();

    await expect(
      rail(page).getByRole("button", {
        name: `Signed in as ${MISLAV.name}. Switch user`,
      })
    ).toBeVisible();
    await expect(dmRow(page, CHARLIE.name)).toBeVisible();
    await expect(dmRow(page, MISLAV.name)).toHaveCount(0);
  });

  test("sidebar and thread panel resize by dragging and remember their width", async ({
    page,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });

    const sidebarHandle = page.getByRole("separator", {
      name: "Resize sidebar",
    });
    const sidebarBefore = await sidebar(page).boundingBox();
    expect(sidebarBefore?.width).toBe(280);
    await dragHandle(page, sidebarHandle, 80);
    await expect
      .poll(async () => (await sidebar(page).boundingBox())?.width)
      .toBe(360);

    const text = uniqueText("resize me");
    await sendMessage(page, text);
    const panel = await openThreadFor(page, text);
    const threadHandle = page.getByRole("separator", {
      name: "Resize thread panel",
    });
    expect((await panel.boundingBox())?.width).toBe(380);
    await dragHandle(page, threadHandle, -60);
    await expect.poll(async () => (await panel.boundingBox())?.width).toBe(440);

    await threadHandle.dblclick();
    await expect.poll(async () => (await panel.boundingBox())?.width).toBe(380);

    await page.reload();
    await expect(channelHeading(page, "general")).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(async () => (await sidebar(page).boundingBox())?.width)
      .toBe(360);
  });

  test("switches workspace from the rail", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await expect(
      sidebar(page).getByRole("heading", { name: "Acme" })
    ).toBeVisible();

    await rail(page).getByRole("button", { name: "Workspace: Acme" }).click();
    await page.getByRole("option", { name: "Initech" }).click();

    await expect(
      rail(page).getByRole("button", { name: "Workspace: Initech" })
    ).toBeVisible();
    await expect(
      sidebar(page).getByRole("heading", { name: "Initech" })
    ).toBeVisible();
    await expect(channelHeading(page, "general")).toBeVisible();
  });
});
