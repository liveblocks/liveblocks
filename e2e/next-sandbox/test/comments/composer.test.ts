import type { ComposerSubmitComment } from "@liveblocks/react-ui";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { TestVariant as ComposerTestVariant } from "../../pages/comments/composer";
import { getJson, preparePage, selectText } from "../utils";

const TEST_URL = "http://localhost:3007/comments/composer";
const TEST_ROOM = "e2e-comments-composer";
const TEST_USER = 12; // Vincent

function getComposer(page: Page) {
  const container = page.locator("#composer");
  const editor = container.locator("[data-slate-editor][contenteditable]");
  const submitButton = container.locator("button[type='submit']");
  const mentionButton = container.locator(
    "button[aria-label='Mention someone']"
  );
  const emojiButton = container.locator("button[aria-label='Add emoji']");

  return {
    container,
    editor,
    submitButton,
    mentionButton,
    emojiButton,
  };
}

async function getOutputJson(page: Page) {
  const output = await getJson(page, "#output");

  return output as unknown as ComposerSubmitComment | undefined;
}

async function getEditorText(editor: Locator) {
  const text = await editor.textContent();

  return text?.replace(/[\u200B-\u200F\uFEFF]/g, "");
}

function resetPage(page: Page) {
  return page.locator("#reset").click();
}

function prepareComposerPage(variant: ComposerTestVariant) {
  return preparePage(
    `${TEST_URL}?room=${encodeURIComponent(TEST_ROOM)}&user=${encodeURIComponent(TEST_USER)}&bg=${encodeURIComponent("#cafbca")}&variant=${encodeURIComponent(variant)}`,
    { x: 0 }
  );
}

test.describe("Composer", () => {
  test.describe("default", () => {
    let page: Page;

    test.beforeAll(async () => {
      page = await prepareComposerPage("default");
    });

    test.afterEach(() => resetPage(page));

    test.afterAll(() => page.close());

    test("should submit with the submit button", async () => {
      const { editor, submitButton } = getComposer(page);

      // Fill the editor and submit it with the submit button
      await editor.fill("Hello, world!");
      await submitButton.click();

      // ➡️ The composer was submitted
      expect(await getOutputJson(page)).not.toBeUndefined();
    });

    test("should submit on enter", async () => {
      const { editor } = getComposer(page);

      // Fill the editor and submit it by pressing Enter
      await editor.fill("Hello, world!");
      await editor.press("Enter");

      // ➡️ The composer was submitted
      expect(await getOutputJson(page)).not.toBeUndefined();
    });

    test("should insert a new paragraph on shift+enter", async () => {
      const { editor, submitButton } = getComposer(page);

      // Fill the editor with two paragraphs and submit it with the submit button
      await editor.pressSequentially("Hello,");
      await editor.press("Shift+Enter");
      await editor.pressSequentially("world!");
      await submitButton.click();

      // ➡️ The submitted comment contains two paragraphs
      const output = await getOutputJson(page);
      expect(output?.body.content[0].type).toEqual("paragraph");
      expect(output?.body.content[0].children).toEqual([{ text: "Hello," }]);
      expect(output?.body.content[1].type).toEqual("paragraph");
      expect(output?.body.content[1].children).toEqual([{ text: "world!" }]);
    });

    test("should not be able to submit if empty", async () => {
      const { editor, submitButton } = getComposer(page);

      // ➡️ The submit button should be disabled
      await expect(submitButton).toBeDisabled();

      // Pressing Enter should not do anything, but we cannot assert that the
      // composer wasn't submitted because nothing has changed from the initial state
      await editor.press("Enter");
    });

    test("should not be able to submit if filled with only whitespace and/or new lines", async () => {
      const { editor, submitButton } = getComposer(page);

      // Fill the editor with only whitespace across two paragraphs
      await editor.pressSequentially("  ");
      await editor.press("Shift+Enter");
      await editor.pressSequentially("  ");

      // ➡️ The submit button should be disabled
      await expect(submitButton).toBeDisabled();

      // Pressing Enter should not do anything
      await editor.press("Enter");

      // ➡️ The composer wasn't submitted and cleared
      expect(await getEditorText(editor)).toEqual("    ");
    });

    test("should not be focused on mount if autoFocus is false", async () => {
      const { editor } = getComposer(page);

      // ➡️ The composer is not focused
      await expect(editor).not.toBeFocused();
    });

    // TODO: I couldn't get this to work, either with editor.press or with page.keyboard.press
    test.skip("should format text via keyboard shortcuts", async () => {
      const { editor } = getComposer(page);

      // Fill the editor
      await editor.fill("bold italic strikethrough code all");

      // Select words and apply formatting via keyboard shortcuts
      await selectText(editor.getByText("bold"), "bold");
      await page.keyboard.press("ControlOrMeta+B");
      await selectText(editor.getByText("italic"), "italic");
      await page.keyboard.press("ControlOrMeta+I");
      await selectText(editor.getByText("strikethrough"), "strikethrough");
      await page.keyboard.press("ControlOrMeta+Shift+S");
      await selectText(editor.getByText("code"), "code");
      await page.keyboard.press("ControlOrMeta+E");
      await selectText(editor.getByText("all"), "all");
      await page.keyboard.press("ControlOrMeta+B");
      await page.keyboard.press("ControlOrMeta+I");
      await page.keyboard.press("ControlOrMeta+Shift+S");
      await page.keyboard.press("ControlOrMeta+E");

      // ➡️ The editor contains the formatted text
      expect(
        await editor.locator("span > strong > span").textContent()
      ).toEqual("bold");
      expect(await editor.locator("span > em > span").textContent()).toEqual(
        "italic"
      );
      expect(await editor.locator("span > s > span").textContent()).toEqual(
        "strikethrough"
      );
      expect(await editor.locator("span > code > span").textContent()).toEqual(
        "code"
      );
      expect(
        await editor
          .locator("span > code > s > em > strong > span")
          .textContent()
      ).toEqual("all");

      await editor.press("Enter");

      // ➡️ The submitted comment contains the formatted text
      const output = await getOutputJson(page);
      expect(output?.body.content[0].children).toEqual([
        { text: "bold", bold: true },
        { text: " " },
        { text: "italic", italic: true },
        { text: " " },
        { text: "strikethrough", strikethrough: true },
        { text: " " },
        { text: "code", code: true },
        { text: " " },
        {
          text: "all",
          code: true,
          strikethrough: true,
          italic: true,
          bold: true,
        },
      ]);
    });

    test("should format text via Markdown shortcuts", async () => {
      const { editor } = getComposer(page);

      // Fill the editor with Markdown shortcuts
      await editor.pressSequentially(
        "*bold* _italic_ ~strikethrough~ `code` *_~`all`~_*"
      );

      // ➡️ The editor contains the formatted text
      expect(
        await editor.locator("span > strong > span").textContent()
      ).toEqual("bold");
      expect(await editor.locator("span > em > span").textContent()).toEqual(
        "italic"
      );
      expect(await editor.locator("span > s > span").textContent()).toEqual(
        "strikethrough"
      );
      expect(await editor.locator("span > code > span").textContent()).toEqual(
        "code"
      );
      expect(
        await editor
          .locator("span > code > s > em > strong > span")
          .textContent()
      ).toEqual("all");

      await editor.press("Enter");

      // ➡️ The submitted comment contains the formatted text
      const output = await getOutputJson(page);
      expect(output?.body.content[0].children).toEqual([
        { text: "bold", bold: true },
        { text: " " },
        { text: "italic", italic: true },
        { text: " " },
        { text: "strikethrough", strikethrough: true },
        { text: " " },
        { text: "code", code: true },
        { text: " " },
        {
          text: "all",
          code: true,
          strikethrough: true,
          italic: true,
          bold: true,
        },
      ]);
    });

    test("should clear formatting when cleared", async () => {
      const { editor } = getComposer(page);

      // Fill the editor with formatted text and delete it afterwards
      await editor.pressSequentially("*_~`all`~_*");
      await editor.press("Backspace");
      await editor.press("Backspace");
      await editor.press("Backspace");
      await editor.press("Backspace");
      await editor.press("Backspace");

      // Fill the editor again
      await editor.pressSequentially("not formatted");

      // ➡️ The submitted comment should not contain any formatting
      await editor.press("Enter");
      const output = await getOutputJson(page);
      expect(output?.body.content[0].children).toEqual([
        { text: "not formatted" },
      ]);
    });

    test("should automatically convert URLs to links", async () => {
      const { editor } = getComposer(page);

      // Fill the editor with text containing URLs
      await editor.pressSequentially(
        "https://liveblocks.io - https://liveblocksio#test,https://google.com/test https://.com https://liveblocks.io/?test#test"
      );

      // ➡️ The editor contains the valid links
      expect(
        await editor
          .locator("span > a[href='https://liveblocks.io']")
          .textContent()
      ).toEqual("https://liveblocks.io");
      expect(
        await editor
          .locator("span > a[href='https://google.com/test']")
          .textContent()
      ).toEqual("https://google.com/test");
      expect(
        await editor
          .locator("span > a[href='https://liveblocks.io/?test#test']")
          .textContent()
      ).toEqual("https://liveblocks.io/?test#test");

      await editor.press("Enter");

      // ➡️ The submitted comment contains the valid links
      const output = await getOutputJson(page);
      expect(output?.body.content[0].children).toEqual([
        { text: "" },
        { type: "link", url: "https://liveblocks.io" },
        { text: " - https://liveblocksio#test," },
        { type: "link", url: "https://google.com/test" },
        { text: " https://.com " },
        { type: "link", url: "https://liveblocks.io/?test#test" },
        { text: "" },
      ]);
    });

    test("should not keep automatically-created links that are no longer valid", async () => {
      const { editor } = getComposer(page);

      // Fill the editor with a valid URL
      await editor.pressSequentially("https://liveblocks.io");

      // ➡️ The editor contains the valid link
      expect(
        await editor
          .locator("span > a[href='https://liveblocks.io']")
          .textContent()
      ).toEqual("https://liveblocks.io");

      // Delete the last few characters of the URL
      await editor.press("Backspace");
      await editor.press("Backspace");
      await editor.press("Backspace");
      await editor.press("Backspace");

      // ➡️ The editor no longer contains the link
      expect(await editor.locator("span > a").count()).toEqual(0);

      // Put back the deleted characters to make the URL valid again
      await editor.pressSequentially("s.io");

      // ➡️ The editor contains the valid link again
      expect(
        await editor
          .locator("span > a[href='https://liveblocks.io']")
          .textContent()
      ).toEqual("https://liveblocks.io");

      // Split the URL across two paragraphs
      await editor.press("ArrowLeft");
      await editor.press("ArrowLeft");
      await editor.press("ArrowLeft");
      await editor.press("ArrowLeft");
      await editor.press("Shift+Enter");

      // ➡️ The editor no longer contains the link again
      expect(await editor.locator("span > a").count()).toEqual(0);
    });

    test("should insert mentions via the keyboard", async () => {
      const { editor } = getComposer(page);

      // Start typing a mention in the editor
      await editor.pressSequentially("Hello @");

      // Wait for at least one mention suggestion to be visible
      await expect(
        page.locator(".lb-composer-suggestions-list-item").first()
      ).toBeVisible();

      // Navigate through the mention suggestions and select one
      await editor.press("ArrowDown");
      await editor.press("ArrowDown");
      await editor.press("Enter");

      await editor.pressSequentially("!");

      // Wait for the mention suggestions to disappear
      await expect(
        page.locator(".lb-composer-mention-suggestions-list")
      ).not.toBeVisible();

      // ➡️ The editor contains the mention
      expect(await getEditorText(editor)).toEqual("Hello @Chris N. !");

      await editor.press("Enter");

      // ➡️ The submitted comment contains the mention
      const output = await getOutputJson(page);
      expect(output?.body.content[0].children).toEqual([
        { text: "Hello " },
        { type: "mention", id: "user-3" },
        { text: " !" },
      ]);
    });

    test("should insert mentions via clicks", async () => {
      const { editor, mentionButton } = getComposer(page);

      await mentionButton.click();

      // Wait for at least one mention suggestion to be visible
      await expect(
        page.locator(".lb-composer-suggestions-list-item").first()
      ).toBeVisible();

      // Select a mention suggestion
      await page
        .locator(".lb-composer-suggestions-list-item")
        .getByText("Alicia H.")
        .click();

      // Wait for the mention suggestions to disappear
      await expect(
        page.locator(".lb-composer-mention-suggestions-list")
      ).not.toBeVisible();

      // ➡️ The editor contains the mention
      expect(await getEditorText(editor)).toEqual("@Alicia H. ");

      await editor.press("Enter");

      // ➡️ The submitted comment contains the mention
      const output = await getOutputJson(page);
      expect(output?.body.content[0].children).toEqual([
        { text: "" },
        { type: "mention", id: "user-2" },
        { text: " " },
      ]);
    });

    test("should insert emojis via the emoji picker", async () => {
      const { editor, emojiButton } = getComposer(page);

      await emojiButton.click();

      const emojiPickerSearch = page.locator(".lb-emoji-picker-search");

      // Wait for the emoji picker to be visible
      await expect(emojiPickerSearch).toBeVisible();

      // Search for "fra" and select the 🇫🇷 emoji
      await emojiPickerSearch.fill("fra");
      await page.getByText("🇫🇷").click();

      // ➡️ The editor contains 🇫🇷
      expect((await editor.textContent())?.includes("🇫🇷")).toBeTruthy();
    });
  });

  test.describe("autoFocus", () => {
    let page: Page;

    test.beforeAll(async () => {
      page = await prepareComposerPage("autoFocus");
    });

    test.afterEach(() => resetPage(page));

    test.afterAll(() => page.close());

    test("should be focused on mount if autoFocus is true", async () => {
      const { editor } = getComposer(page);

      // ➡️ The composer is focused
      await expect(editor).toBeFocused();
    });
  });

  test.describe("disabled", () => {
    let page: Page;

    test.beforeAll(async () => {
      page = await prepareComposerPage("disabled");
    });

    test.afterEach(() => resetPage(page));

    test.afterAll(() => page.close());

    test("should be disabled if disabled is true", async () => {
      const { editor, submitButton } = getComposer(page);

      // ➡️ The editor is disabled
      await expect(editor).toHaveAttribute("disabled");
      await expect(editor).toHaveAttribute("contenteditable", "false");
      await expect(editor).not.toHaveAttribute("role");

      // ➡️ The editor should remain empty
      await editor.focus();
      await editor.pressSequentially("Hello, world!");
      expect(await getEditorText(editor)).toEqual("");

      // ➡️ All buttons should be disabled
      await expect(submitButton).toBeDisabled();

      // TODO: This isn't the case yet, but it should be
      // TODO: Instead of checking buttons individually, we should check that ALL buttons in the container are disabled
      // await expect(mentionButton).toBeDisabled();
      // await expect(emojiButton).toBeDisabled();
    });
  });

  test.describe("defaultValue", () => {
    let page: Page;

    test.beforeAll(async () => {
      page = await prepareComposerPage("defaultValue");
    });

    test.afterEach(() => resetPage(page));

    test.afterAll(() => page.close());

    test("should be initialized with defaultValue if set", async () => {
      const { editor } = getComposer(page);

      // ➡️ The composer is initialized with the default value
      expect(await getEditorText(editor)).toEqual("Hello, world!");
    });
  });
});
