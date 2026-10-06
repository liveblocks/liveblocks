import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { openSlideshow, uniqueRoomUrl } from "./e2e-helpers";

const AVATARS = "header .lb-avatar-stack .lb-avatar";

async function ownAvatarName(page: Page) {
  const avatar = page.locator(AVATARS).first();
  await expect(avatar).toBeVisible();
  return (
    (await avatar.locator("img").getAttribute("alt")) ??
    (await avatar.innerText())
  );
}

test("the header avatar stack shows every distinct user in the room", async ({
  browser,
}) => {
  const url = uniqueRoomUrl("presence");
  const contextA = await browser.newContext();
  const pageA = await openSlideshow(await contextA.newPage(), url);
  const nameA = await ownAvatarName(pageA);

  let contextB: BrowserContext | null = null;
  let pageB: Page | null = null;
  for (let attempt = 0; attempt < 8 && !pageB; attempt++) {
    const candidate = await browser.newContext();
    const page = await openSlideshow(await candidate.newPage(), url);
    if ((await ownAvatarName(page)) !== nameA) {
      contextB = candidate;
      pageB = page;
    } else {
      await candidate.close();
    }
  }
  expect(pageB, "could not get a second distinct demo user").not.toBeNull();

  await expect(pageA.locator(AVATARS)).toHaveCount(2);
  await expect(pageB!.locator(AVATARS)).toHaveCount(2);

  await contextB!.close();
  await expect(pageA.locator(AVATARS)).toHaveCount(1);
  await contextA.close();
});
