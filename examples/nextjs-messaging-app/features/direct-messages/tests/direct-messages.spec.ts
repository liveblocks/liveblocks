import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  TATUM,
  activityRows,
  dmHeaderStatus,
  dmHeading,
  dmRow,
  expectUnread,
  messageByText,
  openApp,
  openAppAs,
  openDm,
  openView,
  railItem,
  sendMessage,
  sidebar,
  uniqueExampleId,
  uniqueText,
} from "@/tests/helpers/e2e";

test.describe("direct messages", () => {
  test("opens a DM and shows the intro and presence", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });

    await openDm(page, MISLAV);
    await expect(
      page.getByText(
        `This is the very beginning of your direct message history with ${MISLAV.name}`
      )
    ).toBeVisible();
    await expect(dmHeaderStatus(page, MISLAV)).toContainText("Offline");

    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    try {
      await expect(dmHeaderStatus(page, MISLAV)).toContainText("Online");
    } finally {
      await other.context.close();
    }
    await expect(dmHeaderStatus(page, MISLAV)).toContainText("Offline");
  });

  test("a DM is delivered to the other user with a badge and activity", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    const text = uniqueText("dm");

    try {
      await openDm(page, MISLAV);
      await sendMessage(page, text);

      await expectUnread(railItem(other.page, "DMs"), 1);
      await expectUnread(railItem(other.page, "Activity"), 1);
      await expectUnread(railItem(other.page, "Home"), 0);
      await expectUnread(dmRow(other.page, CHARLIE), 1);

      await openView(other.page, "DMs");
      const detailedRow = dmRow(other.page, CHARLIE);
      await expect(detailedRow).toContainText(text);

      await openView(other.page, "Activity");
      const item = activityRows(other.page).first();
      await expect(item).toContainText(
        `${CHARLIE.name} sent you a direct message`
      );
      await expect(item).toContainText(text);

      await item.click();
      await expect(dmHeading(other.page, CHARLIE)).toBeVisible();
      await expect(messageByText(other.page, text)).toBeVisible();
      await expectUnread(railItem(other.page, "DMs"), 0);
      await expectUnread(railItem(other.page, "Activity"), 0);

      await expect(item).toContainText(text);

      const reply = uniqueText("reply");
      await sendMessage(other.page, reply);
      await expect(messageByText(page, reply)).toBeVisible();
      await expect(messageByText(page, reply)).toContainText(MISLAV.name);
    } finally {
      await other.context.close();
    }
  });

  test("DMs are private to their two participants", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });
    const bystander = await openAppAs(browser, { exampleId, user: TATUM });
    const text = uniqueText("secret");

    try {
      await openDm(page, MISLAV);
      await sendMessage(page, text);

      await openDm(bystander.page, CHARLIE);
      await expect(messageByText(bystander.page, text)).toHaveCount(0);
      await openDm(bystander.page, MISLAV);
      await expect(messageByText(bystander.page, text)).toHaveCount(0);
      await expectUnread(railItem(bystander.page, "DMs"), 0);
    } finally {
      await bystander.context.close();
    }
  });

  test("the detailed DM list previews the latest message with a You: prefix", async ({
    page,
  }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const text = uniqueText("preview");

    await openDm(page, MISLAV);
    await sendMessage(page, text);

    await openView(page, "DMs");
    const row = dmRow(page, MISLAV);
    await expect(row).toContainText(`You: ${text}`);
    await expect(row).toHaveAttribute("aria-current", "true");
    await expect(sidebar(page).getByText("No messages yet")).not.toHaveCount(0);
  });
});
