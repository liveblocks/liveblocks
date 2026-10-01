import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  TATUM,
  activityRows,
  channelHeading,
  channelRow,
  expectHighlighted,
  expectUnread,
  messageByText,
  openApp,
  openAppAs,
  openThreadFor,
  openView,
  railItem,
  selectChannel,
  sendMessage,
  sendMessageWithMention,
  sidebar,
  threadPanel,
  uniqueExampleId,
  uniqueText,
} from "@/tests/helpers/e2e";

test.describe("mentions and activity", () => {
  test("mentions render as chips in the message", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const tail = uniqueText("ping");

    await sendMessageWithMention(page, {
      mention: "Mislav",
      after: ` ${tail}`,
    });

    const message = messageByText(page, tail);
    await expect(message).toContainText(`@${MISLAV.name}`);
    await expect(message).toContainText(tail);
  });

  test("a channel mention badges Home and the channel and lands in Activity", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const bystander = await openAppAs(browser, { exampleId, user: TATUM });
    const tail = uniqueText("look");

    try {
      await selectChannel(page, "random");
      await sendMessageWithMention(page, {
        mention: "Mislav",
        after: ` ${tail}`,
      });

      await expectUnread(railItem(other.page, "Home"), 1);
      await expectUnread(railItem(other.page, "Activity"), 1);
      await expectUnread(railItem(other.page, "DMs"), 0);
      await expect(
        channelRow(other.page, "random").locator("..").getByLabel("1 unread")
      ).toBeVisible();

      await expectUnread(railItem(bystander.page, "Activity"), 0);

      await openView(other.page, "Activity");
      const item = activityRows(other.page).first();
      await expect(item).toContainText(
        `${CHARLIE.name} mentioned you in #random`
      );
      await expect(item).toContainText(tail);

      await item.click();
      await expect(channelHeading(other.page, "random")).toBeVisible();
      await expectHighlighted(messageByText(other.page, tail));
      await expectUnread(railItem(other.page, "Home"), 0);
      await expectUnread(railItem(other.page, "Activity"), 0);
      await expect(item.getByRole("button").first()).toHaveAttribute(
        "aria-current",
        "true"
      );

      await selectChannel(other.page, "random");
      await expect(messageByText(other.page, tail)).not.toHaveClass(
        /bg-yellow-50/
      );
    } finally {
      await other.context.close();
      await bystander.context.close();
    }
  });

  test("mentions in a thread notify the tagged user as a mention", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const root = uniqueText("root");
    const tail = uniqueText("thoughts");

    try {
      await sendMessage(page, root);
      const panel = await openThreadFor(page, root);
      await sendMessageWithMention(
        page,
        { mention: "Mislav", after: ` ${tail}` },
        panel
      );

      await expectUnread(railItem(other.page, "Activity"), 1);
      await openView(other.page, "Activity");
      const item = activityRows(other.page).first();
      await expect(item).toContainText(
        `${CHARLIE.name} mentioned you in a thread in #general`
      );

      await item.click();
      await expect(threadPanel(other.page)).toBeVisible();
      await expectHighlighted(
        messageByText(other.page, tail, threadPanel(other.page))
      );
    } finally {
      await other.context.close();
    }
  });

  test("mark all as read clears every badge but keeps the history", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });

    try {
      await selectChannel(page, "design");
      await sendMessageWithMention(page, { mention: "Mislav", after: " one" });
      await sendMessageWithMention(page, { mention: "Mislav", after: " two" });

      await expectUnread(railItem(other.page, "Activity"), 2);
      await expectUnread(railItem(other.page, "Home"), 2);

      await openView(other.page, "Activity");
      await expect(activityRows(other.page)).toHaveCount(2);
      await expect(
        sidebar(other.page).getByRole("button", { name: "Mark as read" })
      ).toHaveCount(2);

      await sidebar(other.page)
        .getByRole("button", { name: "Mark all as read" })
        .click();

      await expectUnread(railItem(other.page, "Activity"), 0);
      await expectUnread(railItem(other.page, "Home"), 0);
      await expect(
        sidebar(other.page).getByRole("button", { name: "Mark all as read" })
      ).toHaveCount(0);
      await expect(activityRows(other.page)).toHaveCount(2);
    } finally {
      await other.context.close();
    }
  });

  test("a single item can be marked read from its row", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });

    try {
      await selectChannel(page, "design");
      await sendMessageWithMention(page, { mention: "Mislav", after: " one" });
      await sendMessageWithMention(page, { mention: "Mislav", after: " two" });
      await expectUnread(railItem(other.page, "Activity"), 2);

      await openView(other.page, "Activity");
      const newest = activityRows(other.page).first();
      await newest.hover();
      await newest.getByRole("button", { name: "Mark as read" }).click();

      await expectUnread(railItem(other.page, "Activity"), 1);
      await expect(activityRows(other.page)).toHaveCount(2);
    } finally {
      await other.context.close();
    }
  });

  test("you are not notified about your own mentions", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });

    await sendMessageWithMention(page, { mention: "Charlie", after: " me" });

    await expect(messageByText(page, "me")).toContainText(`@${CHARLIE.name}`);
    await expectUnread(railItem(page, "Activity"), 0);
    await openView(page, "Activity");
    await expect(sidebar(page).getByText("Nothing here yet")).toBeVisible();
  });
});
