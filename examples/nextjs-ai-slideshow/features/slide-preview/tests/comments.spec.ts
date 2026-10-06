import { expect, test } from "@playwright/test";
import { CLOUD_ONLY, openSlideshow, uniqueRoomUrl } from "@/tests/e2e-helpers";

test.skip(!process.env.LIVEBLOCKS_CLOUD, CLOUD_ONLY);

test("placing a comment on the slide creates a pin that other users see", async ({
  browser,
}) => {
  const url = uniqueRoomUrl("comments");
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await openSlideshow(await contextA.newPage(), url);
  const pageB = await openSlideshow(await contextB.newPage(), url);

  await pageA.getByRole("button", { name: "Comment" }).click();
  const preview = pageA.locator('iframe[title="Slide preview"]');
  const box = (await preview.boundingBox())!;
  await pageA.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);

  const composer = pageA.locator(".lb-composer-editor");
  await composer.fill("Looks great");
  await pageA.keyboard.press("Enter");

  await expect(pageA.locator(".lb-comment-pin")).toHaveCount(1);
  await expect(pageB.locator(".lb-comment-pin")).toHaveCount(1);

  await contextA.close();
  await contextB.close();
});
