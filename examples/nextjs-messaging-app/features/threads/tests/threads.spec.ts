import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  TATUM,
  activityRows,
  expectHighlighted,
  expectUnread,
  messageByText,
  openApp,
  openAppAs,
  openThreadFor,
  openView,
  railItem,
  sendMessage,
  threadPanel,
  uniqueExampleId,
  uniqueText,
} from "@/tests/helpers/e2e";

test.describe("threads", () => {
  test("replies in a thread and shows the reply pill", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const root = uniqueText("root");
    const reply = uniqueText("reply");

    await sendMessage(page, root);
    const panel = await openThreadFor(page, root);
    await expect(panel).toContainText(root);
    await expect(panel.getByText("No replies yet")).toBeVisible();

    await sendMessage(page, reply, panel);
    await expect(panel.getByText("1 reply", { exact: true })).toBeVisible();

    const pill = messageByText(page, root).getByRole("button", {
      name: /1 reply/,
    });
    await expect(pill).toBeVisible();
    await panel.getByRole("button", { name: "Close thread" }).click();
    await expect(threadPanel(page)).toHaveCount(0);
    await pill.click();
    await expect(threadPanel(page)).toContainText(reply);
  });

  test("deleting the last reply removes the thread", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const root = uniqueText("root");
    const reply = uniqueText("reply");

    await sendMessage(page, root);
    const panel = await openThreadFor(page, root);
    await sendMessage(page, reply, panel);

    const replyMessage = messageByText(page, reply, panel);
    await replyMessage.hover();
    await replyMessage.getByRole("button", { name: "Delete message" }).click();

    await expect(threadPanel(page)).toHaveCount(0);
    await expect(
      messageByText(page, root).getByRole("button", { name: /repl/ })
    ).toHaveCount(0);
  });

  test("thread replies notify participants, who can jump to the reply", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const bystander = await openAppAs(browser, { exampleId, user: TATUM });
    const root = uniqueText("root");
    const reply = uniqueText("reply");

    try {
      await sendMessage(page, root);
      await openThreadFor(page, root);
      await sendMessage(page, uniqueText("first"), threadPanel(page));

      await openThreadFor(other.page, root);
      await sendMessage(other.page, reply, threadPanel(other.page));
      await expect(
        messageByText(page, root).getByRole("button", { name: /2 replies/ })
      ).toBeVisible();

      await openView(page, "Activity");
      const item = activityRows(page).first();
      await expect(item).toContainText(
        `${MISLAV.name} replied in a thread in #general`
      );
      await expect(item).toContainText(reply);

      await expectUnread(railItem(bystander.page, "Activity"), 0);

      await threadPanel(page)
        .getByRole("button", { name: "Close thread" })
        .click();
      await item.click();
      await expect(threadPanel(page)).toBeVisible();
      await expectHighlighted(messageByText(page, reply, threadPanel(page)));
      await expect(item.getByRole("button").first()).toHaveAttribute(
        "aria-current",
        "true"
      );
    } finally {
      await other.context.close();
      await bystander.context.close();
    }
  });

  test("a participant not viewing the thread gets an unread item", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const root = uniqueText("root");
    const reply = uniqueText("reply");

    try {
      await sendMessage(page, root);
      await openThreadFor(page, root);
      await sendMessage(page, uniqueText("first"), threadPanel(page));
      await threadPanel(page)
        .getByRole("button", { name: "Close thread" })
        .click();

      await openThreadFor(other.page, root);
      await sendMessage(other.page, reply, threadPanel(other.page));

      await expectUnread(railItem(page, "Activity"), 1);
      await expectUnread(railItem(page, "Home"), 0);

      await openView(page, "Activity");
      const item = activityRows(page).first();
      await expect(item).toContainText(reply);
      await item.click();
      await expectHighlighted(messageByText(page, reply, threadPanel(page)));
      await expectUnread(railItem(page, "Activity"), 0);
    } finally {
      await other.context.close();
    }
  });
});
