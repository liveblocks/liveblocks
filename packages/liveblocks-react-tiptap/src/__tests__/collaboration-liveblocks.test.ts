import { Editor, Mark, Node } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { describe, expect, test } from "vitest";

import {
  LIVEBLOCKS_CARET_PLUGIN_KEY,
  LiveblocksCollaborationCaret,
} from "../collaboration-liveblocks/cursors";
import { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY } from "../collaboration-liveblocks/plugin";
import {
  applyRemoteLiveTextUpdates,
  applyRemoteStorageUpdates,
} from "../collaboration-liveblocks/remote";
import {
  createLiveblocksTiptapNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  liveblocksTiptapNodeToJson,
  type ProseMirrorJsonNode,
} from "../collaboration-liveblocks/schema";
import {
  applyIncrementalOperations,
  classifyTransaction,
} from "../collaboration-liveblocks/steps";
import type { LiveblocksTiptapRoom } from "../collaboration-liveblocks/types";

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
  } satisfies LiveblocksTiptapRoom;

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

function getFirstTextNode(root: ReturnType<typeof createLiveblocksTiptapNode>) {
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

    const storageNode = createLiveblocksTiptapNode(document);

    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(document);
  });

  test("applies plain text insertion to an existing LiveText node", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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
    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies text deletion to an existing LiveText node", () => {
    const editor = createEditor("<p>Hello!</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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
    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies mark changes to LiveText formatting", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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
    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies local paragraph insertion to the existing LiveList", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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
    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies local paragraph deletion to the existing LiveList", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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

    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies local paragraph split without replacing the document root", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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

    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies local paragraph merge without replacing the document root", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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

    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies local whole-node replacement to the existing LiveList", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, Panel],
      content: "<p>Hello</p>",
    });
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(
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

    expect(liveblocksTiptapNodeToJson(storageNode)).toEqual(
      newState.doc.toJSON()
    );

    editor.destroy();
  });

  test("applies remote LiveList insert updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksTiptapNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const inserted = createLiveblocksTiptapNode({
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
    expect(editor.getJSON()).toEqual(liveblocksTiptapNodeToJson(storageNode));
    expect(editor.state.selection.anchor).toBe(3);

    editor.destroy();
  });

  test("applies remote LiveList delete updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const storageNode = createLiveblocksTiptapNode(
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
    expect(editor.getJSON()).toEqual(liveblocksTiptapNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveList set updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p><p>World</p>");
    const storageNode = createLiveblocksTiptapNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const replacement = createLiveblocksTiptapNode({
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
    expect(editor.getJSON()).toEqual(liveblocksTiptapNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote paragraph split updates using updated positions", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksTiptapNode(
      getDocumentJson(editor.state.doc)
    );
    const content = getLiveblocksNodeContent(storageNode);
    expect(content).toBeDefined();
    const firstHalf = createLiveblocksTiptapNode({
      type: "paragraph",
      content: [{ type: "text", text: "He" }],
    });
    const secondHalf = createLiveblocksTiptapNode({
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
    expect(editor.getJSON()).toEqual(liveblocksTiptapNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveText insert updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksTiptapNode(
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
    expect(editor.getJSON()).toEqual(liveblocksTiptapNodeToJson(storageNode));

    editor.destroy();
  });

  test("applies remote LiveText delete updates to the editor document", () => {
    const editor = createEditor("<p>Hello!</p>");
    const storageNode = createLiveblocksTiptapNode(
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
    expect(editor.getJSON()).toEqual(liveblocksTiptapNodeToJson(storageNode));

    editor.destroy();
  });

  test("renders stale end-of-paragraph carets inside the previous text block", () => {
    const { room, setRemoteCursor } = createCaretTestRoom(6);
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        LiveblocksCollaborationCaret.configure({ room }),
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
