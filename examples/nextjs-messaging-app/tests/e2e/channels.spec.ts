import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  channelHeading,
  channelRow,
  openApp,
  openAppAs,
  sidebar,
  uniqueExampleId,
  uniqueText,
} from "./helpers";

test.describe("channels", () => {
  test("creates a channel and opens it", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const name = uniqueText("launch").replace(" ", "-");

    await sidebar(page).getByRole("button", { name: "Add channel" }).click();
    const input = sidebar(page).getByPlaceholder("channel-name");
    await input.fill(name);
    await input.press("Enter");

    await expect(channelRow(page, name)).toBeVisible();
    await expect(channelHeading(page, name)).toBeVisible();
    await expect(page.getByText(`Welcome to #${name}`)).toBeVisible();
  });

  test("escape cancels creating a channel", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await sidebar(page).getByRole("button", { name: "Add channel" }).click();
    const input = sidebar(page).getByPlaceholder("channel-name");
    await input.fill("nope");
    await input.press("Escape");

    await expect(input).toHaveCount(0);
    await expect(channelRow(page, "nope")).toHaveCount(0);
  });

  test("renames a channel", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const row = channelRow(page, "random");
    const renamed = uniqueText("renamed").replace(" ", "-");

    await row.hover();
    await sidebar(page).getByRole("button", { name: "Rename random" }).click();
    const input = sidebar(page).locator("input[type='text']");
    await expect(input).toHaveValue("random");
    await input.fill(renamed);
    await input.press("Enter");

    await expect(channelRow(page, renamed)).toBeVisible();
    await expect(channelRow(page, "random")).toHaveCount(0);
  });

  test("deletes a channel and falls back to the first one", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await channelRow(page, "design").click();
    await expect(channelHeading(page, "design")).toBeVisible();

    await channelRow(page, "design").hover();
    await sidebar(page).getByRole("button", { name: "Delete design" }).click();

    await expect(channelRow(page, "design")).toHaveCount(0);
    await expect(channelHeading(page, "general")).toBeVisible();
  });

  test("channel changes sync to other users in realtime", async ({ page, browser }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const name = uniqueText("shared").replace(" ", "-");

    try {
      await sidebar(page).getByRole("button", { name: "Add channel" }).click();
      const input = sidebar(page).getByPlaceholder("channel-name");
      await input.fill(name);
      await input.press("Enter");

      await expect(channelRow(other.page, name)).toBeVisible();

      await channelRow(page, name).hover();
      await sidebar(page).getByRole("button", { name: `Delete ${name}` }).click();

      await expect(channelRow(other.page, name)).toHaveCount(0);
    } finally {
      await other.context.close();
    }
  });
});
