import { expect, test } from "@playwright/test";
import {
  AI_NAME,
  CHARLIE,
  IS_LOCAL_BACKEND,
  dmHeaderStatus,
  messageByText,
  openApp,
  openDm,
  sendMessage,
  sendMessageWithMention,
  threadPanel,
  uniqueExampleId,
  uniqueText,
} from "@/tests/helpers/e2e";

test.describe("AI teammate", () => {
  test.skip(
    IS_LOCAL_BACKEND,
    "needs the cloud backend: the local dev server stubs REST feed endpoints"
  );

  test("replies inline in its DM", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const text = uniqueText("question");

    await openDm(page, AI_NAME);
    await expect(dmHeaderStatus(page, AI_NAME)).toContainText("Agent");
    await sendMessage(page, text);

    const reply = page
      .locator("[data-message-id]")
      .filter({ hasText: AI_NAME })
      .filter({ hasText: "mock reply" });
    await expect(reply).toBeVisible({ timeout: 30_000 });
    await expect(reply).toContainText(text);
    await reply.hover();
    await expect(
      reply.getByRole("button", { name: "Reply in thread" })
    ).toHaveCount(0);
  });

  test("@mentioning it in a channel opens a thread with its reply", async ({
    page,
  }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const tail = uniqueText("help");

    await sendMessageWithMention(page, {
      mention: "Liveblocks",
      after: ` ${tail}`,
    });

    const panel = threadPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(tail);
    await expect(panel.getByText("mock reply")).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel).toContainText(tail);
    await expect(
      messageByText(page, tail).getByRole("button", { name: /1 reply/ })
    ).toBeVisible();
  });
});
