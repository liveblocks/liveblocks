import { expect, test } from "@playwright/test";
import {
  EMPTY_SLIDE_HEADLINE,
  openSlideshow,
  previewFrame,
  STARTER_HEADLINE,
  thumbnails,
  uniqueRoomUrl,
} from "@/tests/e2e-helpers";

test("a new room opens with one starter slide and no delete control", async ({
  page,
}) => {
  await openSlideshow(page, uniqueRoomUrl("deck-starter"));

  await expect(thumbnails(page)).toHaveCount(1);
  await expect(previewFrame(page).locator("h1")).toHaveText(STARTER_HEADLINE);
  await expect(
    page.getByRole("button", { name: "Delete slide 1" })
  ).toBeHidden();
});

test("adding a slide selects it, shows the empty-slide copy, and deleting it goes back to one", async ({
  page,
}) => {
  await openSlideshow(page, uniqueRoomUrl("deck-add-delete"));

  await page.getByRole("button", { name: "Add slide" }).click();
  await expect(thumbnails(page)).toHaveCount(2);
  await expect(page.getByText("Slide 2", { exact: true })).toBeVisible();
  await expect(previewFrame(page).locator("h1")).toHaveText(
    EMPTY_SLIDE_HEADLINE
  );

  await page.getByRole("button", { name: "Delete slide 2" }).click({
    force: true,
  });
  await expect(thumbnails(page)).toHaveCount(1);
  await expect(previewFrame(page).locator("h1")).toHaveText(STARTER_HEADLINE);
});

test("slides added in one tab appear in another tab of the same room", async ({
  browser,
}) => {
  const url = uniqueRoomUrl("deck-sync");
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await openSlideshow(await contextA.newPage(), url);
  const pageB = await openSlideshow(await contextB.newPage(), url);

  await pageA.getByRole("button", { name: "Add slide" }).click();
  await expect(thumbnails(pageB)).toHaveCount(2);
  await expect(pageB.getByText("Slide 2", { exact: true })).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("dragging a thumbnail reorders the deck", async ({ page }) => {
  await openSlideshow(page, uniqueRoomUrl("deck-reorder"));
  await page.getByRole("button", { name: "Add slide" }).click();
  await expect(thumbnails(page)).toHaveCount(2);

  const first = page.getByRole("button", { name: /Slide 1/ });
  const second = page.getByRole("button", { name: /Slide 2/ });
  const from = (await second.boundingBox())!;
  const to = (await first.boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2,
    from.y + from.height / 2 - 10,
    {
      steps: 4,
    }
  );
  await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 12 });
  await page.mouse.up();

  await page.getByRole("button", { name: /Slide 1/ }).click();
  await expect(previewFrame(page).locator("h1")).toHaveText(
    EMPTY_SLIDE_HEADLINE
  );
});
