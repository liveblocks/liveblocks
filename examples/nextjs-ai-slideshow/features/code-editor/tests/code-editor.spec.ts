import { expect, test } from "@playwright/test";
import {
  openSlideshow,
  previewFrame,
  uniqueRoomUrl,
} from "@/tests/e2e-helpers";

test("typing in the code editor updates the preview and other users' editors", async ({
  browser,
}) => {
  const url = uniqueRoomUrl("code-editor");
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await openSlideshow(await contextA.newPage(), url);
  const pageB = await openSlideshow(await contextB.newPage(), url);

  await pageA.getByRole("tab", { name: "Code" }).click();
  const editor = pageA.locator(".cm-content");
  await expect(editor).toContainText("<!doctype html>");

  await editor.click();
  await pageA.keyboard.press("ControlOrMeta+End");
  await pageA.keyboard.press("ArrowUp");
  await pageA.keyboard.press("End");
  await pageA.keyboard.type('<p id="typed">typed in code</p>');

  await pageA.getByRole("tab", { name: "Preview" }).click();
  await expect(previewFrame(pageA).locator("#typed")).toHaveText(
    "typed in code"
  );
  await expect(previewFrame(pageB).locator("#typed")).toHaveText(
    "typed in code"
  );

  await pageB.getByRole("tab", { name: "Code" }).click();
  const editorB = pageB.locator(".cm-content");
  await editorB.click();
  await pageB.keyboard.press("ControlOrMeta+End");
  await expect(editorB).toContainText("typed in code");

  await contextA.close();
  await contextB.close();
});

test("the toolbar undo and redo drive the code editor's own history on the Code tab", async ({
  page,
}) => {
  await openSlideshow(page, uniqueRoomUrl("code-editor-undo"));
  await page.getByRole("tab", { name: "Code" }).click();
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });
  await expect(undo).toBeDisabled();

  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("<!-- x -->");
  await expect(editor).toContainText("<!-- x -->");
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(editor).not.toContainText("<!-- x -->");
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(editor).toContainText("<!-- x -->");
});
