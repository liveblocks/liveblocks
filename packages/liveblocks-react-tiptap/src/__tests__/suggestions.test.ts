import { Editor, Node as TiptapNode } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { afterEach, describe, expect, test } from "vitest";

import {
  collectSuggestionRanges,
  SuggestionsExtension,
} from "../suggestions/SuggestionsExtension";
import { getCleanSuggestionContent } from "../suggestions/utils";

const editors: Editor[] = [];

const BulletList = TiptapNode.create({
  name: "bulletList",
  group: "block",
  content: "listItem+",
  parseHTML: () => [{ tag: "ul" }],
  renderHTML: () => ["ul", 0],
});

const ListItem = TiptapNode.create({
  name: "listItem",
  content: "paragraph block*",
  parseHTML: () => [{ tag: "li" }],
  renderHTML: () => ["li", 0],
});

function createEditor(content: string, { lists = false } = {}) {
  let nextId = 0;
  const editor = new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      ...(lists ? [BulletList, ListItem] : []),
      SuggestionsExtension.configure({
        initialMode: "suggesting",
        createSuggestionId: () => `suggestion-${++nextId}`,
        getUserId: () => "user-1",
      }),
    ],
    content: `<p>${content}</p>`,
  });

  editors.push(editor);
  return editor;
}

function getTextForSuggestion(editor: Editor, suggestionId: string) {
  const range = collectSuggestionRanges(editor.state.doc).find(
    (suggestion) => suggestion.suggestionId === suggestionId
  );

  return range
    ? editor.state.doc.textBetween(range.from, range.to, "\n")
    : null;
}

afterEach(() => {
  for (const editor of editors) {
    editor.destroy();
  }
  editors.length = 0;
});

describe("SuggestionsExtension", () => {
  test("marks inserted content in suggestion mode", () => {
    const editor = createEditor("Hello");

    editor.commands.setTextSelection(6);
    editor.commands.insertContent("!");

    const suggestions = collectSuggestionRanges(editor.state.doc);

    expect(suggestions).toMatchObject([
      {
        suggestionId: "suggestion-1",
        userId: "user-1",
        kind: "insert",
      },
    ]);
    expect(getTextForSuggestion(editor, "suggestion-1")).toBe("!");
  });

  test("keeps deleted content and marks it as a deletion", () => {
    const editor = createEditor("Hello");

    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.deleteSelection();

    const suggestions = collectSuggestionRanges(editor.state.doc);
    expect(editor.state.doc.textBetween(0, editor.state.doc.content.size)).toBe(
      "Hello"
    );
    expect(suggestions).toMatchObject([
      {
        suggestionId: "suggestion-1",
        userId: "user-1",
        kind: "delete",
      },
    ]);
  });

  test("merges adjacent deletions from repeated backspace", () => {
    const editor = createEditor("Hello");

    editor.commands.setTextSelection({ from: 5, to: 6 });
    editor.commands.deleteSelection();
    editor.commands.setTextSelection({ from: 4, to: 5 });
    editor.commands.deleteSelection();

    const suggestions = collectSuggestionRanges(editor.state.doc);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      suggestionId: "suggestion-1",
      userId: "user-1",
      kind: "delete",
    });
    expect(getTextForSuggestion(editor, "suggestion-1")).toBe("lo");
  });

  test("keeps empty list item deletions reviewable", () => {
    const editor = createEditor(
      "<ul><li><p></p></li><li><p>Second</p></li></ul>",
      { lists: true }
    );

    editor.commands.deleteRange({ from: 1, to: 5 });

    const suggestions = collectSuggestionRanges(editor.state.doc);

    expect(
      new Set(suggestions.map((suggestion) => suggestion.suggestionId))
    ).toEqual(new Set(["suggestion-1"]));
    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          suggestionId: "suggestion-1",
          userId: "user-1",
          kind: "delete",
          isBlockPlaceholder: true,
        }),
      ])
    );

    editor.commands.rejectSuggestion("suggestion-1");

    expect(collectSuggestionRanges(editor.state.doc)).toHaveLength(0);
    expect(editor.state.doc.textBetween(0, editor.state.doc.content.size)).toBe(
      "Second"
    );
  });

  test("accepts empty list item deletions by removing the list item", () => {
    const editor = createEditor(
      "<ul><li><p></p></li><li><p>Second</p></li></ul>",
      { lists: true }
    );

    editor.commands.deleteRange({ from: 1, to: 5 });
    editor.commands.acceptSuggestion("suggestion-1");

    expect(editor.getJSON()).toMatchObject({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test("accepts and rejects suggestions", () => {
    const editor = createEditor("Hello");

    editor.commands.setTextSelection(6);
    editor.commands.insertContent("!");
    editor.commands.rejectSuggestion("suggestion-1");

    expect(editor.state.doc.textBetween(0, editor.state.doc.content.size)).toBe(
      "Hello"
    );

    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.deleteSelection();
    editor.commands.acceptSuggestion("suggestion-2");

    expect(editor.state.doc.textBetween(0, editor.state.doc.content.size)).toBe(
      ""
    );
  });

  test("projects a clean document without pending suggestions", () => {
    const editor = createEditor("Hello");

    editor.commands.setTextSelection(6);
    editor.commands.insertContent("!");
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.deleteSelection();

    const clean = getCleanSuggestionContent(editor.getJSON());

    expect(clean).toMatchObject({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello",
            },
          ],
        },
      ],
    });
  });
});
