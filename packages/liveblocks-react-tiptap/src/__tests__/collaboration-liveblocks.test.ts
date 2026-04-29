import { Editor, Mark } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { describe, expect, test } from "vitest";

import { applyRemoteLiveTextUpdates } from "../collaboration-liveblocks/remote";
import {
  createLiveblocksTiptapNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  liveblocksTiptapNodeToJson,
} from "../collaboration-liveblocks/schema";
import {
  applyIncrementalOperations,
  classifyTransaction,
} from "../collaboration-liveblocks/steps";

const Bold = Mark.create({
  name: "bold",
  parseHTML: () => [{ tag: "strong" }],
  renderHTML: () => ["strong", 0],
});

function createEditor(content: string) {
  return new Editor({
    extensions: [Document, Paragraph, Text, Bold],
    content,
  });
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
    const storageNode = createLiveblocksTiptapNode(oldState.doc.toJSON());
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
    const storageNode = createLiveblocksTiptapNode(oldState.doc.toJSON());
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
    const storageNode = createLiveblocksTiptapNode(oldState.doc.toJSON());
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

  test("returns unsupported for structural edits", () => {
    const editor = createEditor("<p>Hello</p>");
    const oldState = editor.state;
    const storageNode = createLiveblocksTiptapNode(oldState.doc.toJSON());
    const tr = oldState.tr.split(3);
    const newState = oldState.apply(tr);

    expect(
      classifyTransaction([tr], oldState.doc, newState.doc, storageNode)
    ).toEqual({ type: "unsupported" });

    editor.destroy();
  });

  test("applies remote LiveText insert updates to the editor document", () => {
    const editor = createEditor("<p>Hello</p>");
    const storageNode = createLiveblocksTiptapNode(editor.state.doc.toJSON());
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
    const storageNode = createLiveblocksTiptapNode(editor.state.doc.toJSON());
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
});
