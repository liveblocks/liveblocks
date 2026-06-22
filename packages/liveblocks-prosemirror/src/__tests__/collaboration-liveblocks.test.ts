import type { LsonObject, StorageUpdate } from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject, LiveText } from "@liveblocks/client";
import { Editor, Extension, Mark, Node } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Slice } from "prosemirror-model";
import { describe, expect, test } from "vitest";

import {
  createLiveblocksCollaborationCaretPlugin,
  LIVEBLOCKS_CARET_PLUGIN_KEY,
} from "../cursors";
import {
  createLiveblocksCollaborationPlugin,
  LIVEBLOCKS_COLLABORATION_PLUGIN_KEY,
  LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY,
} from "../plugin";
import {
  applyRemoteLiveTextUpdates,
  applyRemoteStorageUpdates,
} from "../remote";
import {
  createLiveblocksProsemirrorNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  liveblocksProsemirrorNodeToJson,
  type ProseMirrorJsonNode,
} from "../schema";
import { applyIncrementalOperations, classifyTransaction } from "../steps";
import type { LiveblocksProsemirrorRoom } from "../types";

function createDefaultDocument(): ProseMirrorJsonNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function liveblocksNodeToJson(
  node: ReturnType<typeof createLiveblocksProsemirrorNode>
) {
  return liveblocksProsemirrorNodeToJson(node, createDefaultDocument);
}

const TestLiveblocksCollaborationCaret = Extension.create({
  name: "collaborationCaret",
  addOptions() {
    return {
      room: undefined as LiveblocksProsemirrorRoom | undefined,
      field: "default",
      user: {},
    };
  },
  addStorage() {
    return {
      users: [],
    };
  },
  addProseMirrorPlugins() {
    return [
      createLiveblocksCollaborationCaretPlugin(this.options, this.storage),
    ];
  },
});

const TestLiveblocksCollaboration = Extension.create({
  name: "collaboration",
  addOptions() {
    return {
      room: undefined as LiveblocksProsemirrorRoom | undefined,
      field: "default",
      initialContent: undefined as ProseMirrorJsonNode | undefined,
      fallbackDocument: createDefaultDocument,
    };
  },
  addProseMirrorPlugins() {
    return [
      createLiveblocksCollaborationPlugin({
        room: this.options.room,
        field: this.options.field,
        initialContent: this.options.initialContent,
        fallbackDocument: this.options.fallbackDocument,
      }),
    ];
  },
});

const Bold = Mark.create({
  name: "bold",
  parseHTML: () => [{ tag: "strong" }],
  renderHTML: () => ["strong", 0],
});

const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "inline*",
  parseHTML: () => [{ tag: "section" }],
  renderHTML: () => ["section", 0],
});

function createEditor(content: string) {
  return new Editor({
    extensions: [Document, Paragraph, Text, Bold],
    content,
  });
}

function createCollaborationTestRoom(root = new LiveObject<LsonObject>({})) {
  let onStorageUpdate: ((updates: StorageUpdate[]) => void) | undefined;
  const room = {
    batch(callback: () => void) {
      callback();
    },
    getOthers() {
      return [];
    },
    getStorage: async () => ({ root }),
    history: {
      canUndo: () => false,
      canRedo: () => false,
      disable: <T>(callback: () => T) => callback(),
      undo: () => {},
      redo: () => {},
    },
    subscribe(
      _node: LiveObject<LsonObject>,
      callback: (updates: StorageUpdate[]) => void
    ) {
      onStorageUpdate = callback;
      return () => {
        onStorageUpdate = undefined;
      };
    },
    updatePresence: () => {},
    events: {
      others: {
        subscribe: () => () => {},
      },
    },
  } satisfies LiveblocksProsemirrorRoom;

  return {
    room,
    root,
    notifyStorageUpdate(updates: StorageUpdate[]) {
      onStorageUpdate?.(updates);
    },
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

function createCaretTestRoom(initialPosition = 1) {
  let onOthersUpdate: (() => void) | undefined;
  let presence = {
    liveblocksTiptap: {
      field: "default",
      anchor: initialPosition,
      head: initialPosition,
      user: { name: "Ada", color: "#f00" },
    },
  };

  const room = {
    batch(callback: () => void) {
      callback();
    },
    getOthers() {
      return [
        {
          connectionId: 1,
          presence,
        },
      ];
    },
    getStorage: () =>
      Promise.reject(new Error("Unexpected storage access in caret test")),
    history: {
      canUndo: () => false,
      canRedo: () => false,
      disable: <T>(callback: () => T) => callback(),
      undo: () => {},
      redo: () => {},
    },
    subscribe: () => () => {},
    updatePresence: () => {},
    events: {
      others: {
        subscribe(callback: () => void) {
          onOthersUpdate = callback;
          return () => {
            onOthersUpdate = undefined;
          };
        },
      },
    },
  } satisfies LiveblocksProsemirrorRoom;

  return {
    room,
    setRemoteCursor(position: number) {
      presence = {
        liveblocksTiptap: {
          ...presence.liveblocksTiptap,
          anchor: position,
          head: position,
        },
      };
      onOthersUpdate?.();
    },
  };
}

function getRemoteCaretWidgetPosition(editor: Editor): number | undefined {
  return LIVEBLOCKS_CARET_PLUGIN_KEY.getState(
    editor.state
  )?.decorations.find()[0]?.from;
}

function isProseMirrorJsonNode(value: unknown): value is ProseMirrorJsonNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function getDocumentJson(doc: ProseMirrorNode): ProseMirrorJsonNode {
  const json: unknown = doc.toJSON();
  if (!isProseMirrorJsonNode(json)) {
    throw new Error("Expected ProseMirror document JSON");
  }

  return json;
}

function getFirstTextNode(
  root: ReturnType<typeof createLiveblocksProsemirrorNode>
) {
  const docContent = getLiveblocksNodeContent(root);
  const paragraph = docContent?.get(0);
  const paragraphContent =
    paragraph !== undefined ? getLiveblocksNodeContent(paragraph) : undefined;
  return paragraphContent?.get(0);
}

describe("collaboration-liveblocks schema", () => {
  test("round-trips a ProseMirror document through Liveblocks storage nodes", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "left" },
          content: [
            {
              type: "text",
              text: "Hello",
              marks: [{ type: "bold" }],
            },
            {
              type: "text",
              text: " world",
            },
          ],
        },
      ],
    };

    const storageNode = createLiveblocksProsemirrorNode(document);

    expect(liveblocksNodeToJson(storageNode)).toEqual(document);
  });

  test("applies plain text insertion to an existing LiveText node", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const textNode = getFirstTextNode(storageNode);
    expect(textNode).toBeDefined();
    const textNodeId = getLiveblocksNodeId(textNode!);

    const tr = oldState.tr.insertText("!", 6);
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      applyIncrementalOperations(classified.operations);
    }

    const nextTextNode = getFirstTextNode(storageNode);
    expect(nextTextNode).toBeDefined();
    expect(getLiveblocksNodeId(nextTextNode!)).toBe(textNodeId);
    expect(getLiveblocksNodeText(nextTextNode!)?.toString()).toBe("Hello!");
    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies text deletion to an existing LiveText node", () => {
    const editor = createEditor("<p>Hello!</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const textNode = getFirstTextNode(storageNode);
    expect(textNode).toBeDefined();
    const textNodeId = getLiveblocksNodeId(textNode!);

    const tr = oldState.tr.delete(6, 7);
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      applyIncrementalOperations(classified.operations);
    }

    const nextTextNode = getFirstTextNode(storageNode);
    expect(nextTextNode).toBeDefined();
    expect(getLiveblocksNodeId(nextTextNode!)).toBe(textNodeId);
    expect(getLiveblocksNodeText(nextTextNode!)?.toString()).toBe("Hello");
    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies mark changes to LiveText formatting", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const textNode = getFirstTextNode(storageNode);
    expect(textNode).toBeDefined();
    const textNodeId = getLiveblocksNodeId(textNode!);
    const bold = oldState.schema.marks.bold;

    const tr = oldState.tr.addMark(1, 6, bold.create());
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      applyIncrementalOperations(classified.operations);
    }

    const nextTextNode = getFirstTextNode(storageNode);
    expect(nextTextNode).toBeDefined();
    expect(getLiveblocksNodeId(nextTextNode!)).toBe(textNodeId);
    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies local paragraph insertion to the existing LiveList", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const firstParagraph = content!.get(0);
    expect(firstParagraph).toBeDefined();
    const firstParagraphId = getLiveblocksNodeId(firstParagraph!);
    const paragraphType = oldState.schema.nodes.paragraph;
    expect(paragraphType).toBeDefined();
    const tr = oldState.tr.insert(
      oldState.doc.content.size,
      paragraphType.create(undefined, oldState.schema.text("World"))
    );
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      applyIncrementalOperations(classified.operations);
    }

    const nextFirstParagraph = content!.get(0);
    expect(nextFirstParagraph).toBeDefined();
    expect(getLiveblocksNodeId(nextFirstParagraph!)).toBe(firstParagraphId);
    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies local paragraph deletion to the existing LiveList", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const from = oldState.doc.child(0).nodeSize;
    const to = from + oldState.doc.child(1).nodeSize;
    const tr = oldState.tr.delete(from, to);
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      applyIncrementalOperations(classified.operations);
    }

    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies local paragraph split without replacing the document root", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const tr = oldState.tr.split(3);
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      expect(classified.operations).toEqual([
        expect.objectContaining({ type: "setNode", index: 0 }),
        expect.objectContaining({ type: "insertNode", index: 1 }),
      ]);
      applyIncrementalOperations(classified.operations);
    }

    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies local paragraph merge without replacing the document root", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const tr = oldState.tr.join(oldState.doc.child(0).nodeSize);
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      expect(classified.operations).toEqual([
        expect.objectContaining({ type: "setNode", index: 0 }),
        expect.objectContaining({ type: "deleteNode", index: 1 }),
      ]);
      applyIncrementalOperations(classified.operations);
    }

    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("applies local whole-node replacement to the existing LiveList", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, Panel],
      content: "<p>Hello</p>",
    });
    const oldState = editor.state;
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(oldState.doc)
    );
    const panelType = oldState.schema.nodes.panel;
    expect(panelType).toBeDefined();
    const tr = oldState.tr.replaceWith(
      0,
      oldState.doc.child(0).nodeSize,
      panelType.create(undefined, oldState.schema.text("World"))
    );
    const newState = oldState.apply(tr);
    const classified = classifyTransaction(
      [tr],
      oldState.doc,
      newState.doc,
      storageNode
    );

    expect(classified.type).toBe("incremental");
    if (classified.type === "incremental") {
      expect(classified.operations).toEqual([
        expect.objectContaining({ type: "setNode", index: 0 }),
      ]);
      applyIncrementalOperations(classified.operations);
    }

    expect(liveblocksNodeToJson(storageNode)).toEqual(newState.doc.toJSON());

    editor.destroy();
  });

  test("stores collaboration documents inside the reserved documents map", async () => {
    const { room, root } = createCollaborationTestRoom();
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TestLiveblocksCollaboration.configure({ room }),
      ],
      content: "<p>Hello</p>",
    });

    await flushAsyncWork();

    const documents = root.get(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY);
    expect(documents).toBeInstanceOf(LiveMap);

    const storedDocument =
      documents instanceof LiveMap ? documents.get("default") : undefined;
    expect(storedDocument).toBeInstanceOf(LiveObject);
    expect(liveblocksNodeToJson(storedDocument!)).toEqual(editor.getJSON());

    editor.destroy();
  });

  test("stores different collaboration fields as separate documents", async () => {
    const root = new LiveObject<LsonObject>({});
    const first = createCollaborationTestRoom(root);
    const second = createCollaborationTestRoom(root);
    const firstEditor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TestLiveblocksCollaboration.configure({
          room: first.room,
          field: "one",
        }),
      ],
      content: "<p>Hello</p>",
    });
    const secondEditor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TestLiveblocksCollaboration.configure({
          room: second.room,
          field: "two",
        }),
      ],
      content: "<p>World</p>",
    });

    await flushAsyncWork();

    const documents = root.get(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY);
    expect(documents).toBeInstanceOf(LiveMap);

    const firstDocument =
      documents instanceof LiveMap ? documents.get("one") : undefined;
    const secondDocument =
      documents instanceof LiveMap ? documents.get("two") : undefined;
    expect(firstDocument).toBeInstanceOf(LiveObject);
    expect(secondDocument).toBeInstanceOf(LiveObject);
    expect(liveblocksNodeToJson(firstDocument!)).toEqual(firstEditor.getJSON());
    expect(liveblocksNodeToJson(secondDocument!)).toEqual(
      secondEditor.getJSON()
    );

    firstEditor.destroy();
    secondEditor.destroy();
  });

  test("writes local collaboration updates back into the matching documents map entry", async () => {
    const { room, root } = createCollaborationTestRoom();
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TestLiveblocksCollaboration.configure({ room, field: "body" }),
      ],
      content: "<p>Hello</p>",
    });

    await flushAsyncWork();

    editor.commands.setContent("<p>Hello world</p>");

    const documents = root.get(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY);
    const storedDocument =
      documents instanceof LiveMap ? documents.get("body") : undefined;
    expect(storedDocument).toBeInstanceOf(LiveObject);
    expect(liveblocksNodeToJson(storedDocument!)).toEqual(editor.getJSON());

    editor.destroy();
  });

  test("ignores storage echoes for local LiveText updates", async () => {
    const { room, root, notifyStorageUpdate } = createCollaborationTestRoom();
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TestLiveblocksCollaboration.configure({ room }),
      ],
      content: "<p>Hello</p>",
    });

    await flushAsyncWork();

    editor.commands.insertContentAt(6, "!");

    const documents = root.get(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY);
    const storedDocument =
      documents instanceof LiveMap ? documents.get("default") : undefined;
    expect(storedDocument).toBeInstanceOf(LiveObject);
    const textNode = getFirstTextNode(storedDocument!);
    expect(textNode).toBeDefined();
    const text = getLiveblocksNodeText(textNode!);
    expect(text).toBeInstanceOf(LiveText);

    notifyStorageUpdate([
      {
        type: "LiveText",
        node: text!,
        updates: [
          {
            type: "insert",
            index: 5,
            text: "!",
          },
        ],
      },
    ]);

    expect(editor.getJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello!" }],
        },
      ],
    });

    editor.destroy();
  });

  test("applies remote LiveList insert updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const inserted = createLiveblocksProsemirrorNode({
      type: "paragraph",
      content: [{ type: "text", text: "World" }],
    });

    editor.commands.setTextSelection(3);
    content!.insert(inserted, 1);
    const result = applyRemoteStorageUpdates(editor.view, storageNode, [
      {
        type: "LiveList",
        node: content!,
        updates: [{ type: "insert", index: 1, item: inserted }],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));
    expect(editor.state.selection.anchor).toBe(3);

    editor.destroy();
  });

  test("applies remote LiveList delete updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const deletedItem = content!.get(1);
    expect(deletedItem).toBeDefined();

    content!.delete(1);
    const result = applyRemoteStorageUpdates(editor.view, storageNode, [
      {
        type: "LiveList",
        node: content!,
        updates: [{ type: "delete", index: 1, deletedItem: deletedItem! }],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveList set updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const replacement = createLiveblocksProsemirrorNode({
      type: "paragraph",
      content: [{ type: "text", text: "Everyone" }],
    });

    content!.set(1, replacement);
    const result = applyRemoteStorageUpdates(editor.view, storageNode, [
      {
        type: "LiveList",
        node: content!,
        updates: [{ type: "set", index: 1, item: replacement }],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote paragraph split updates using updated positions", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const firstHalf = createLiveblocksProsemirrorNode({
      type: "paragraph",
      content: [{ type: "text", text: "He" }],
    });
    const secondHalf = createLiveblocksProsemirrorNode({
      type: "paragraph",
      content: [{ type: "text", text: "llo" }],
    });

    content!.set(0, firstHalf);
    content!.insert(secondHalf, 1);
    const result = applyRemoteStorageUpdates(editor.view, storageNode, [
      {
        type: "LiveList",
        node: content!,
        updates: [
          { type: "set", index: 0, item: firstHalf },
          { type: "insert", index: 1, item: secondHalf },
        ],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveText insert updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const textNode = getFirstTextNode(storageNode);
    expect(textNode).toBeDefined();
    const text = getLiveblocksNodeText(textNode!);
    expect(text).toBeDefined();

    text!.insert(5, "!");
    const result = applyRemoteLiveTextUpdates(editor.view, storageNode, [
      {
        type: "LiveText",
        node: text!,
        version: text!.version,
        updates: [{ type: "insert", index: 5, text: "!" }],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveText delete updates to the editor document", () => {
    const editor = createEditor("<p>Hello!</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const textNode = getFirstTextNode(storageNode);
    expect(textNode).toBeDefined();
    const text = getLiveblocksNodeText(textNode!);
    expect(text).toBeDefined();

    text!.delete(5, 1);
    const result = applyRemoteLiveTextUpdates(editor.view, storageNode, [
      {
        type: "LiveText",
        node: text!,
        version: text!.version,
        updates: [{ type: "delete", index: 5, length: 1, deletedText: "!" }],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveText delete when clearing the entire text node", () => {
    const editor = createEditor("<p>Hello from LiveText-backed Tiptap.</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const textNode = getFirstTextNode(storageNode);
    expect(textNode).toBeDefined();
    const text = getLiveblocksNodeText(textNode!);
    expect(text).toBeDefined();

    const deletedLength = text!.length;
    text!.delete(0, deletedLength);

    const result = applyRemoteLiveTextUpdates(editor.view, storageNode, [
      {
        type: "LiveText",
        node: text!,
        version: text!.version,
        updates: [
          {
            type: "delete",
            index: 0,
            length: deletedLength,
            deletedText: "Hello from LiveText-backed Tiptap.",
          },
        ],
      },
    ]);
    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("falls back safely when remote updates delete all formatted text", () => {
    const editor = createEditor("<p><strong>Hello</strong> world</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const paragraph = getLiveblocksNodeContent(storageNode)?.get(0);
    const paragraphContent = paragraph
      ? getLiveblocksNodeContent(paragraph)
      : undefined;

    for (let index = 0; index < (paragraphContent?.length ?? 0); index++) {
      const textNode = paragraphContent?.get(index);
      const text = textNode ? getLiveblocksNodeText(textNode) : undefined;
      text?.delete(0, text.length);
    }

    const document = liveblocksNodeToJson(storageNode);
    expect(document).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });

    const view = editor.view;
    const nextDocument = view.state.schema.nodeFromJSON(document);
    const diffStart = view.state.doc.content.findDiffStart(
      nextDocument.content
    );
    expect(diffStart).not.toBeNull();

    const diffEnd = view.state.doc.content.findDiffEnd(nextDocument.content);
    expect(() => {
      const tr =
        diffEnd === null
          ? view.state.tr.replace(
              0,
              view.state.doc.content.size,
              new Slice(nextDocument.content, 0, 0)
            )
          : view.state.tr.replace(
              diffStart!,
              diffEnd.a,
              nextDocument.slice(diffStart!, diffEnd.b)
            );
      view.dispatch(tr);
    }).not.toThrow();
    expect(editor.getJSON()).toEqual(document);

    editor.destroy();
  });

  test("applies remote LiveText delete when clearing multi-segment formatted text", () => {
    const editor = createEditor("<p><strong>Hello</strong> world</p>");
    const text = new LiveText([
      ["Hello", { __liveblocks_tiptap_marks: [{ type: "bold" }] }],
      [" world"],
    ]);
    const storageNode = new LiveObject({
      id: "doc",
      type: "doc",
      content: new LiveList([
        new LiveObject({
          id: "paragraph",
          type: "paragraph",
          content: new LiveList([
            new LiveObject({
              id: "text",
              type: "text",
              text,
            }),
          ]),
        }),
      ]),
    }) as unknown as ReturnType<typeof createLiveblocksProsemirrorNode>;

    const deletedLength = text.length;
    text.delete(0, deletedLength);

    const result = applyRemoteLiveTextUpdates(editor.view, storageNode, [
      {
        type: "LiveText",
        node: text,
        version: text.version,
        updates: [
          {
            type: "delete",
            index: 0,
            length: deletedLength,
            deletedText: "Hello world",
          },
        ],
      },
    ]);

    expect(result.type).toBe("applied");
    if (result.type === "applied") {
      editor.view.dispatch(result.tr);
    }
    expect(editor.getJSON()).toEqual(liveblocksNodeToJson(storageNode));

    editor.destroy();
  });

  test("falls back safely when remote updates delete the last paragraph", () => {
    const editor = createEditor("<p>Hello from LiveText-backed Tiptap.</p>");
    const storageNode = createLiveblocksProsemirrorNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();

    content!.delete(0);
    const document = liveblocksNodeToJson(storageNode);
    expect(document).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });

    const view = editor.view;
    const nextDocument = view.state.schema.nodeFromJSON(document);

    expect(() => {
      view.dispatch(
        view.state.tr.replace(
          0,
          view.state.doc.content.size,
          new Slice(nextDocument.content, 0, 0)
        )
      );
    }).not.toThrow();

    editor.destroy();
  });

  test("renders stale end-of-paragraph carets inside the previous text block", () => {
    const { room, setRemoteCursor } = createCaretTestRoom(6);
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TestLiveblocksCollaborationCaret.configure({ room }),
      ],
      content: "<p>Hello!</p><p>World</p>",
    });

    setRemoteCursor(7);
    editor.view.dispatch(
      editor.state.tr
        .delete(6, 7)
        .setMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY, { isRemote: true })
    );

    expect(
      LIVEBLOCKS_CARET_PLUGIN_KEY.getState(editor.state)?.cursors[0]?.head
    ).toBe(7);
    expect(getRemoteCaretWidgetPosition(editor)).toBe(6);

    editor.destroy();
  });
});
