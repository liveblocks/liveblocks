import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  composer,
  messageByText,
  openApp,
  openAppAs,
  selectChannel,
  sendMessage,
  uniqueExampleId,
  uniqueText,
} from "./helpers";

test.describe("messaging", () => {
  test("sends a message in a channel", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const text = uniqueText("hello");

    await sendMessage(page, text);

    const message = messageByText(page, text);
    await expect(message).toContainText(CHARLIE.name);
    await expect(message.locator("time")).toBeVisible();
    // The composer is cleared and the send button disabled again
    await expect(composer(page)).toHaveText("");
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  test("the send button is disabled while the composer is empty", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const send = page.getByRole("button", { name: "Send message" });

    await expect(send).toBeDisabled();
    await composer(page).click();
    await composer(page).pressSequentially("x");
    await expect(send).toBeEnabled();
  });

  test("renders markdown shortcuts", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const word = uniqueText("strong").replace(" ", "");

    const editor = composer(page);
    await editor.click();
    await editor.pressSequentially(`**${word}** and `);
    await editor.pressSequentially("`code` here");
    await editor.press("Enter");

    const message = messageByText(page, word);
    await expect(message.locator("strong")).toContainText(word);
    await expect(message.locator("code")).toHaveText("code");
  });

  test("messages stay with their channel", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const inGeneral = uniqueText("general-only");
    const inRandom = uniqueText("random-only");

    await sendMessage(page, inGeneral);
    await selectChannel(page, "random");
    await expect(messageByText(page, inGeneral)).toHaveCount(0);
    await sendMessage(page, inRandom);

    await selectChannel(page, "general");
    await expect(messageByText(page, inGeneral)).toBeVisible();
    await expect(messageByText(page, inRandom)).toHaveCount(0);
  });

  test("messages persist across a reload", async ({ page }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const text = uniqueText("persisted");

    await sendMessage(page, text);
    await openApp(page, { exampleId, user: CHARLIE });

    await expect(messageByText(page, text)).toBeVisible();
  });

  test("deletes your own message but not others'", async ({ page, browser }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const mine = uniqueText("mine");
    const theirs = uniqueText("theirs");

    try {
      await sendMessage(page, mine);
      await sendMessage(other.page, theirs);
      await expect(messageByText(page, theirs)).toBeVisible();

      await messageByText(page, theirs).hover();
      await expect(
        messageByText(page, theirs).getByRole("button", { name: "Delete message" })
      ).toHaveCount(0);

      await messageByText(page, mine).hover();
      await messageByText(page, mine)
        .getByRole("button", { name: "Delete message" })
        .click();

      await expect(messageByText(page, mine)).toHaveCount(0);
      await expect(messageByText(other.page, mine)).toHaveCount(0);
    } finally {
      await other.context.close();
    }
  });

  test("other users see new messages and typing indicators live", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const text = uniqueText("live");

    try {
      const editor = composer(page);
      await editor.click();
      await editor.pressSequentially("typing something");
      await expect(other.page.getByText(`${CHARLIE.name} is typing…`)).toBeVisible();

      await editor.press("Enter");
      await expect(messageByText(other.page, "typing something")).toBeVisible();
      await expect(other.page.getByText(`${CHARLIE.name} is typing…`)).toHaveCount(0);

      await sendMessage(other.page, text);
      const received = messageByText(page, text);
      await expect(received).toBeVisible();
      await expect(received).toContainText(MISLAV.name);
    } finally {
      await other.context.close();
    }
  });

  test("shows who is online in the channel", async ({ page, browser }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });

    try {
      await page
        .getByRole("button", { name: "View members of this channel" })
        .click();
      const members = page.getByRole("dialog");
      await expect(members.getByText("6 members")).toBeVisible();

      const row = (name: string) =>
        members.getByRole("listitem").filter({ hasText: name });
      await expect(row(CHARLIE.name)).toContainText("(you)");
      await expect(row(CHARLIE.name)).toContainText("Online");
      await expect(row(MISLAV.name)).toContainText("Online");
      await expect(row("Tatum Paolo")).toContainText("Offline");
      await expect(row("Liveblocks AI")).toContainText("Online");

      // Leaving takes the user offline
      await other.context.close();
      await expect(row(MISLAV.name)).toContainText("Offline");
    } finally {
      await other.context.close();
    }
  });
});
