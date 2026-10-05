import { expect, test } from "@playwright/test";
import {
  AI_NAME,
  AI_USER,
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
    "needs the cloud backend and an AI_GATEWAY_API_KEY in .env.local: the local dev server stubs REST feed endpoints"
  );

  test("replies inline in its DM", async ({ page }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: CHARLIE });
    const text = uniqueText("question");

    await openDm(page, AI_USER);
    await expect(dmHeaderStatus(page, AI_USER)).toContainText("Agent");
    await sendMessage(page, text);

    const reply = page
      .locator("[data-message-id]")
      .filter({ hasText: AI_NAME })
      .filter({ hasNotText: text });
    await expect(reply).toBeVisible({ timeout: 30_000 });
    await expect(reply).not.toContainText("Thinking…", { timeout: 60_000 });
    await expect(reply).not.toContainText("something went wrong");
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
    const reply = panel
      .locator("[data-message-id]")
      .filter({ hasText: AI_NAME })
      .filter({ hasNotText: tail });
    await expect(reply).toBeVisible({ timeout: 30_000 });
    await expect(reply).not.toContainText("Thinking…", { timeout: 60_000 });
    await expect(reply).not.toContainText("something went wrong");
    await expect(
      messageByText(page, tail).getByRole("button", { name: /1 reply/ })
    ).toBeVisible();
  });
});
