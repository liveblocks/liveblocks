import { expect, test } from "@playwright/test";
import {
  CLOUD_ONLY,
  openSlideshow,
  previewFrame,
  STARTER_HEADLINE,
  uniqueRoomUrl,
} from "@/tests/e2e-helpers";

test.skip(!process.env.LIVEBLOCKS_CLOUD, CLOUD_ONLY);

test("a starter prompt produces an AI proposal that can be applied to the current slide", async ({
  page,
}) => {
  await openSlideshow(page, uniqueRoomUrl("ai-chat-apply"));

  await page
    .getByRole("button", {
      name: "Create a launch slide for a realtime design tool",
    })
    .click();

  await expect(
    page.getByText("Create a launch slide for a realtime design tool").first()
  ).toBeVisible();
  const apply = page.getByRole("button", { name: "Apply to slide" });
  await expect(apply).toBeVisible({ timeout: 30_000 });

  await apply.click();
  await expect(page.getByText("Applied", { exact: true })).toBeVisible();
  await expect(previewFrame(page).locator("h1")).not.toHaveText(
    STARTER_HEADLINE
  );
});

test("rejecting a proposal leaves the slide unchanged", async ({ page }) => {
  await openSlideshow(page, uniqueRoomUrl("ai-chat-reject"));

  await page
    .getByRole("textbox", { name: /Ask the AI/ })
    .fill("Make this slide feel more premium");
  await page.keyboard.press("Enter");

  const reject = page.getByRole("button", { name: "Reject" });
  await expect(reject).toBeVisible({ timeout: 30_000 });
  await reject.click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await expect(previewFrame(page).locator("h1")).toHaveText(STARTER_HEADLINE);
});
