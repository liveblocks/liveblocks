import { expect, test } from "@playwright/test";
import {
  openSlideshow,
  previewFrame,
  STARTER_HEADLINE,
  uniqueRoomUrl,
} from "@/tests/e2e-helpers";

test("double-clicking text in the preview edits it inline and writes the change to the shared HTML", async ({
  browser,
}) => {
  const url = uniqueRoomUrl("visual-text");
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await openSlideshow(await contextA.newPage(), url);
  const pageB = await openSlideshow(await contextB.newPage(), url);

  const headline = previewFrame(pageA).locator("h1");
  await expect(headline).toHaveText(STARTER_HEADLINE);
  await headline.dblclick();
  await expect(headline).toHaveAttribute("contenteditable", "true");

  await pageA.keyboard.type("Edited visually");
  await pageA.keyboard.press("ControlOrMeta+Enter");

  await expect(headline).toHaveText("Edited visually");
  await expect(previewFrame(pageB).locator("h1")).toHaveText("Edited visually");

  await pageA.getByRole("tab", { name: "Code" }).click();
  const editor = pageA.locator(".cm-content");
  await editor.click();
  await pageA.keyboard.press("ControlOrMeta+End");
  await expect(editor).toContainText("Edited visually");

  await contextA.close();
  await contextB.close();
});

test("dragging an element moves it with a translate transform that undo reverts", async ({
  page,
}) => {
  await openSlideshow(page, uniqueRoomUrl("visual-drag"));

  const card = previewFrame(page).locator(".card");
  const box = (await card.boundingBox())!;
  const startX = box.x + box.width / 2;
  const startY = box.y + 12;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 40, startY + 20, { steps: 8 });
  await page.mouse.move(startX + 80, startY + 40, { steps: 8 });
  await page.mouse.up();

  await expect(card).toHaveAttribute("style", /translate\(/);

  const undo = page.getByRole("button", { name: "Undo" });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(card).not.toHaveAttribute("style", /translate\(/);

  const redo = page.getByRole("button", { name: "Redo" });
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(card).toHaveAttribute("style", /translate\(/);
});
