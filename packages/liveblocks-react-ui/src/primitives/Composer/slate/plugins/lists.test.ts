import type { KeyboardEvent } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createEditor, Editor, Element, Transforms } from "slate";
import { withHistory, type HistoryEditor } from "slate-history";
import { withReact, type ReactEditor } from "slate-react";

import type { ComposerEditor } from "../../../../types";
import { handleListKeyDown, handleListMarkdownShortcut, withLists } from "./lists";
import { insertMention, withMentions } from "./mentions";

type ListTestEditor = ComposerEditor & ReactEditor & HistoryEditor;

function createListTestEditor(): ListTestEditor {
  return withLists(
    withHistory(withReact(createEditor()))
  ) as ListTestEditor;
}

function createListWithMentionsEditor(): ListTestEditor {
  return withLists(
    withHistory(withReact(withMentions(createEditor())))
  ) as ListTestEditor;
}

describe("withLists", () => {
  let editor: ListTestEditor;

  beforeEach(() => {
    editor = createListTestEditor();
  });

  test("merges adjacent lists of the same type at the root", () => {
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "a" }] }],
          },
        ],
      },
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "b" }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.start(editor, [0, 0, 0]));

    Editor.normalize(editor, { force: true });

    expect(editor.children).toEqual([
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "a" }] }],
          },
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "b" }] }],
          },
        ],
      },
    ]);
  });
});

describe("handleListMarkdownShortcut", () => {
  let editor: ListTestEditor;

  beforeEach(() => {
    editor = createListTestEditor();
    editor.children = [
      {
        type: "paragraph",
        children: [{ text: "-" }],
      },
    ];
    // Keydown runs before the space is inserted; cursor is after the dash only.
    Transforms.select(editor, Editor.end(editor, [0]));
  });

  test('turns "-" + space into a bulleted list', () => {
    const preventDefault = vi.fn();

    const handled = handleListMarkdownShortcut(editor, {
      key: " ",
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    expect(editor.children[0]).toMatchObject({
      type: "bulleted-list",
    });
    expect(Editor.string(editor, [0])).toContain("");
  });

  test("does not apply list markdown mid-line inside a list item", () => {
    editor.children = [
      {
        type: "numbered-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "- " }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.end(editor, [0, 0, 0]));

    const before = structuredClone(editor.children);
    const preventDefault = vi.fn();

    const handled = handleListMarkdownShortcut(editor, {
      key: " ",
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(editor.children).toEqual(before);
  });

  test('turns "[ ]" + space at document root into a task list', () => {
    editor.children = [
      {
        type: "paragraph",
        children: [{ text: "[ ]" }],
      },
    ];
    Transforms.select(editor, Editor.end(editor, [0]));

    const preventDefault = vi.fn();
    const handled = handleListMarkdownShortcut(editor, {
      key: " ",
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(handled).toBe(true);
    expect(editor.children[0]).toMatchObject({ type: "task-list" });
  });

  test("at start of a bullet list item, \"1.\" + space converts the list to numbered", () => {
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "1." }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.end(editor, [0, 0, 0]));

    const preventDefault = vi.fn();
    const handled = handleListMarkdownShortcut(editor, {
      key: " ",
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(handled).toBe(true);
    expect(editor.children[0]).toMatchObject({ type: "numbered-list" });
  });

  test("at start of a bullet list item, \"[ ]\" + space converts the list to task", () => {
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "[ ]" }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.end(editor, [0, 0, 0]));

    const preventDefault = vi.fn();
    const handled = handleListMarkdownShortcut(editor, {
      key: " ",
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(handled).toBe(true);
    expect(editor.children[0]).toMatchObject({ type: "task-list" });
  });
});

describe("withLists empty list collapse", () => {
  test("after select-all delete, a lone list with text becomes a single empty paragraph", async () => {
    const editor = createListTestEditor();
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "hello" }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    });

    Editor.deleteFragment(editor);
    await Promise.resolve();

    expect(editor.children).toEqual([
      { type: "paragraph", children: [{ text: "" }] },
    ]);
  });

  test("inserting a mention over draft text in a list item keeps the list", async () => {
    const editor = createListWithMentionsEditor();
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [
              {
                type: "paragraph",
                children: [{ text: "@alice" }],
              },
            ],
          },
        ],
      },
    ];
    Transforms.select(editor, {
      anchor: { path: [0, 0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0, 0], offset: 6 },
    });

    insertMention(editor, { kind: "user", id: "alice" });
    await Promise.resolve();

    expect(editor.children[0]).toMatchObject({ type: "bulleted-list" });
    const mentions = [
      ...Editor.nodes(editor, {
        at: [],
        match: (n) => Element.isElement(n) && n.type === "mention",
      }),
    ];
    expect(mentions.length).toBe(1);
    expect(mentions[0]?.[0]).toMatchObject({
      type: "mention",
      kind: "user",
      id: "alice",
    });
  });

  test("inserting a mention in the second list item keeps two items when the first item is empty", async () => {
    const editor = createListWithMentionsEditor();
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "" }] }],
          },
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "@bob" }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, {
      anchor: { path: [0, 1, 0, 0], offset: 0 },
      focus: { path: [0, 1, 0, 0], offset: 4 },
    });

    insertMention(editor, { kind: "user", id: "bob" });
    await Promise.resolve();

    const list = editor.children[0] as { children: unknown[] };
    expect(list.children.length).toBe(2);
  });
});

describe("handleListKeyDown Tab", () => {
  test("does not preventDefault when Tab cannot indent the list item", () => {
    const editor = createListTestEditor();
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "only" }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.start(editor, [0, 0, 0]));

    const preventDefault = vi.fn();
    const handled = handleListKeyDown(editor, {
      key: "Tab",
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
describe("handleListKeyDown", () => {
  let editor: ListTestEditor;

  beforeEach(() => {
    editor = createListTestEditor();
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "hello" }] }],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.end(editor, [0, 0, 0]));
  });

  test("Shift+Enter splits the list item; plain Enter is not handled", () => {
    const preventDefault = vi.fn();

    const shiftEnterHandled = handleListKeyDown(editor, {
      key: "Enter",
      shiftKey: true,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(shiftEnterHandled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(editor.children[0]).toMatchObject({ type: "bulleted-list" });
    const list = editor.children[0] as { children: unknown[] };
    expect(list.children.length).toBe(2);

    const enterHandled = handleListKeyDown(editor, {
      key: "Enter",
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(enterHandled).toBe(false);
  });
});

describe("handleListKeyDown Shift+Enter with marks", () => {
  test("splits at end of a multi-leaf paragraph; first item keeps all leaves, second is empty", () => {
    const editor = createListTestEditor();
    editor.children = [
      {
        type: "bulleted-list",
        children: [
          {
            type: "list-item",
            children: [
              {
                type: "paragraph",
                children: [
                  { text: "test", code: true },
                  { text: " " },
                  { text: "bold", bold: true },
                  { text: " test??" },
                ],
              },
            ],
          },
        ],
      },
    ];
    Transforms.select(editor, Editor.end(editor, [0, 0, 0]));

    const handled = handleListKeyDown(editor, {
      key: "Enter",
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);

    expect(handled).toBe(true);
    const list = editor.children[0] as {
      children: Array<{ children: Array<{ children: unknown[] }> }>;
    };
    expect(list.children.length).toBe(2);
    expect(list.children[0].children[0].children).toEqual([
      { text: "test", code: true },
      { text: " " },
      { text: "bold", bold: true },
      { text: " test??" },
    ]);
    expect(list.children[1].children[0].children).toEqual([{ text: "" }]);
  });
});
