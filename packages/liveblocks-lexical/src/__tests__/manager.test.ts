import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $dfs } from "@lexical/utils";
import {
  LiveList,
  LiveMap,
  LiveObject,
  LiveText,
  type Room,
} from "@liveblocks/client";
import type { Json, TextAttributes } from "@liveblocks/core";
import { kInternal, kStorageUpdateSource } from "@liveblocks/core";
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COLLABORATION_TAG,
  createEditor as createLexicalEditor,
  type ElementNode,
  type LexicalEditor,
  ParagraphNode,
  type TextModeType,
  TextNode,
} from "lexical";
import { describe, expect, test, vi } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../../liveblocks-core/src/__tests__/_MockWebSocketServer.setup";
import {
  $getLexicalNodeProps,
  $setLexicalNodeProps,
  areTextNodesStructurallyEqual,
  find_liveblocksNode,
  LiveblocksCollaborationManager,
} from "../manager";
import type {
  LiveElementNode,
  LiveLineBreakNode,
  LiveRootNode,
  LiveStorageNode,
  LiveTextNode,
} from "../types";

describe("LiveblocksCollaborationManager", () => {
  describe("$encodeSelection", () => {
    test("encodes a collapsed text caret", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello world"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.select(3, 3);
      });

      editor.read(() => {
        const textNodeId = text_liveblocks[kInternal].getId();
        expect(textNodeId).toBeDefined();
        const version = text_liveblocks.get("content").version;
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: textNodeId,
            type: "text",
            offset: 3,
            version,
          },
          focus: {
            nodeId: textNodeId,
            type: "text",
            offset: 3,
            version,
          },
        });
      });
    });

    test("encodes a non-collapsed text range within a single TextNode", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello world"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.select(1, 5);
      });

      editor.read(() => {
        const textNodeId = text_liveblocks[kInternal].getId();
        const version = text_liveblocks.get("content").version;
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: textNodeId,
            type: "text",
            offset: 1,
            version,
          },
          focus: {
            nodeId: textNodeId,
            type: "text",
            offset: 5,
            version,
          },
        });
      });
    });

    test("flattens offsets across coalesced TextNodes that share one LiveText", async () => {
      // One LiveText with two segments → two Lexical TextNodes, one binding.
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([
                      ["Hello ", { bold: true }],
                      ["world"],
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        expect(textNodes).toHaveLength(2);
        // Caret in "world" at local offset 1 → flat LiveText offset 7.
        textNodes[1]!.select(1, 1);
      });

      editor.read(() => {
        const textNodeId = text_liveblocks[kInternal].getId();
        const version = text_liveblocks.get("content").version;
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: textNodeId,
            type: "text",
            offset: 7,
            version,
          },
          focus: {
            nodeId: textNodeId,
            type: "text",
            offset: 7,
            version,
          },
        });
      });
    });

    test("encodes a range spanning coalesced TextNodes into flat LiveText offsets", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([
                      ["Hello ", { bold: true }],
                      ["world"],
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        const selection = $createRangeSelection();
        // "Hell|o " … "wo|rld" → flat [4, 8]
        selection.anchor.set(textNodes[0]!.getKey(), 4, "text");
        selection.focus.set(textNodes[1]!.getKey(), 2, "text");
        $setSelection(selection);
      });

      editor.read(() => {
        const textNodeId = text_liveblocks[kInternal].getId();
        const version = text_liveblocks.get("content").version;
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: textNodeId,
            type: "text",
            offset: 4,
            version,
          },
          focus: {
            nodeId: textNodeId,
            type: "text",
            offset: 8,
            version,
          },
        });
      });
    });

    test("does not accumulate offsets across adjacent distinct LiveText children", async () => {
      // Concurrent remote inserts can leave two separate LiveText children
      // whose Lexical TextNodes sit next to each other. Formats differ so
      // Lexical does not merge them.
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([["foo", { bold: true }]]),
                  }),
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("bar"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;
      const second_liveblocks = (paragraph_liveblocks as LiveElementNode)
        .get("children")
        .get(1)! as LiveTextNode;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        expect(textNodes).toHaveLength(2);
        // Caret inside "bar" at offset 1 — must NOT include "foo"'s length.
        textNodes[1]!.select(1, 1);
      });

      editor.read(() => {
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(encoded!.anchor).toEqual({
          nodeId: second_liveblocks[kInternal].getId(),
          type: "text",
          offset: 1,
          version: second_liveblocks.get("content").version,
        });
        expect(encoded!.focus).toEqual(encoded!.anchor);
      });
    });

    test("encodes an element point, coalescing TextNodes that share one LiveText", async () => {
      // Lexical: [Text "Hi" bold, Text "there", LineBreak]
      // Storage: [text (coalesced), linebreak]
      // Element caret after both text nodes (Lexical index 2) → storage offset 1.
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([["Hi", { bold: true }], ["there"]]),
                  }),
                  new LiveObject({
                    kind: "linebreak",
                    type: "linebreak",
                    version: 1,
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(3);
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 2, "element");
        selection.focus.set(paragraph.getKey(), 2, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
          focus: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
        });
      });
    });

    test("encodes an element point between adjacent distinct LiveText children", async () => {
      // Lexical: [Text "foo" bold, Text "bar"] — two storage text children.
      // Element caret between them (Lexical index 1) → storage offset 1,
      // not 0 (would happen if all adjacent text were blindly coalesced).
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([["foo", { bold: true }]]),
                  }),
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("bar"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(2);
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 1, "element");
        selection.focus.set(paragraph.getKey(), 1, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
          focus: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
        });
      });
    });

    test("encodes an element point at the end of a paragraph", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hi"),
                  }),
                  new LiveObject({
                    kind: "linebreak",
                    type: "linebreak",
                    version: 1,
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        // Children: [Text, LineBreak] → end is Lexical index 2 → storage 2.
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 2, "element");
        selection.focus.set(paragraph.getKey(), 2, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 2,
            version: 0,
          },
          focus: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 2,
            version: 0,
          },
        });
      });
    });

    test("returns null when the selected text node is unbound", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        const extra = $createTextNode("extra");
        paragraph.append(extra);
        extra.select(0, 0);
      });

      editor.read(() => {
        expect(manager.$encodeSelection()).toBeNull();
      });
    });

    test("returns null when an element point crosses an unbound text child", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        paragraph.append($createTextNode("extra"));
        // Element caret after the unbound text (Lexical index 2).
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 2, "element");
        selection.focus.set(paragraph.getKey(), 2, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        expect(manager.$encodeSelection()).toBeNull();
      });
    });

    test("returns null when there is no range selection", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        expect(manager.$encodeSelection()).toBeNull();
      });
    });

    test("encodes through LiveText.encodeIndex after a local pending insert", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const liveText = text_liveblocks.get("content");

      // Local pending insert at index 0 shifts local "H|ello" caret without
      // bumping the confirmed version. encodeIndex must report confirmed coords.
      liveText.insert(0, "X");
      const version = liveText.version;

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        // Mirror the local LiveText content in Lexical and place caret after "X".
        text_lexical.setTextContent(liveText.toString());
        text_lexical.select(1, 1);
      });

      editor.read(() => {
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        // Local caret at 1 (after pending "X") → confirmed offset 0.
        expect(encoded!.anchor.offset).toBe(liveText[kInternal].encodeIndex(1));
        expect(encoded!.anchor.offset).toBe(0);
        expect(encoded!.anchor.version).toBe(version);
        expect(encoded!.anchor.nodeId).toBe(text_liveblocks[kInternal].getId());
      });
    });

    test("returns null when storage nodes are detached (no node id)", () => {
      // createParagraphDocument builds LiveObjects that never enter a room
      // pool, so getId() is undefined and presence cannot be published.
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.select(2, 2);
      });

      editor.read(() => {
        expect(text_liveblocks[kInternal].getId()).toBeUndefined();
        expect(manager.$encodeSelection()).toBeNull();
      });
    });

    test("encodes a range spanning two root paragraphs", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("One"),
                  }),
                ]),
              }),
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Two"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const first_liveblocks = (
        document.get("children").get(0) as LiveElementNode
      )
        .get("children")
        .get(0)! as LiveTextNode;
      const second_liveblocks = (
        document.get("children").get(1) as LiveElementNode
      )
        .get("children")
        .get(0)! as LiveTextNode;

      editor.update(() => {
        const paragraphs = $dfs()
          .filter(({ node }) => $isParagraphNode(node))
          .map(({ node }) => node as ParagraphNode);
        expect(paragraphs).toHaveLength(2);
        const firstText = paragraphs[0]!
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        const secondText = paragraphs[1]!
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        const selection = $createRangeSelection();
        selection.anchor.set(firstText.getKey(), 1, "text");
        selection.focus.set(secondText.getKey(), 2, "text");
        $setSelection(selection);
      });

      editor.read(() => {
        expect(manager.$encodeSelection()).toEqual({
          anchor: {
            nodeId: first_liveblocks[kInternal].getId(),
            type: "text",
            offset: 1,
            version: first_liveblocks.get("content").version,
          },
          focus: {
            nodeId: second_liveblocks[kInternal].getId(),
            type: "text",
            offset: 2,
            version: second_liveblocks.get("content").version,
          },
        });
      });
    });
  });

  describe("$decodeSelection", () => {
    test("round-trips a collapsed text caret", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello world"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.select(3, 3);
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: text_lexical.getKey(), offset: 3, type: "text" },
          focus: { key: text_lexical.getKey(), offset: 3, type: "text" },
        });
      });
    });

    test("round-trips a caret inside coalesced text", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([
                      ["Hello ", { bold: true }],
                      ["world"],
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        textNodes[1]!.select(1, 1);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const secondText = paragraph
          .getChildren()
          .filter($isTextNode)[1] as TextNode;
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: secondText.getKey(), offset: 1, type: "text" },
          focus: { key: secondText.getKey(), offset: 1, type: "text" },
        });
      });
    });

    test("round-trips a non-collapsed range across coalesced segments", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([
                      ["Hello ", { bold: true }],
                      ["world"],
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        const selection = $createRangeSelection();
        selection.anchor.set(textNodes[0]!.getKey(), 4, "text");
        selection.focus.set(textNodes[1]!.getKey(), 2, "text");
        $setSelection(selection);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: textNodes[0]!.getKey(), offset: 4, type: "text" },
          focus: { key: textNodes[1]!.getKey(), offset: 2, type: "text" },
        });
      });
    });

    test("round-trips a caret in the second of adjacent distinct LiveText children", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([["foo", { bold: true }]]),
                  }),
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("bar"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        textNodes[1]!.select(1, 1);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: textNodes[1]!.getKey(), offset: 1, type: "text" },
          focus: { key: textNodes[1]!.getKey(), offset: 1, type: "text" },
        });
      });
    });

    test("round-trips an element point after coalesced text", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([["Hi", { bold: true }], ["there"]]),
                  }),
                  new LiveObject({
                    kind: "linebreak",
                    type: "linebreak",
                    version: 1,
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 2, "element");
        selection.focus.set(paragraph.getKey(), 2, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const encoded = manager.$encodeSelection();
        expect(encoded).toEqual({
          anchor: {
            nodeId: document.get("children").get(0)![kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
          focus: {
            nodeId: document.get("children").get(0)![kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
        });
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: paragraph.getKey(), offset: 2, type: "element" },
          focus: { key: paragraph.getKey(), offset: 2, type: "element" },
        });
      });
    });

    test("round-trips an element point between adjacent distinct LiveText children", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([["foo", { bold: true }]]),
                  }),
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("bar"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 1, "element");
        selection.focus.set(paragraph.getKey(), 1, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(encoded!.anchor.offset).toBe(1);
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: paragraph.getKey(), offset: 1, type: "element" },
          focus: { key: paragraph.getKey(), offset: 1, type: "element" },
        });
      });
    });

    test("returns null when the storage node id is unknown", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        expect(
          manager.$decodeSelection({
            anchor: {
              nodeId: "missing-node-id",
              type: "text",
              offset: 0,
              version: 0,
            },
            focus: {
              nodeId: "missing-node-id",
              type: "text",
              offset: 0,
              version: 0,
            },
          })
        ).toBeNull();
      });
    });

    test("returns null when LiveText version is ahead of local state", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.read(() => {
        const textNodeId = text_liveblocks[kInternal].getId();
        expect(
          manager.$decodeSelection({
            anchor: {
              nodeId: textNodeId!,
              type: "text",
              offset: 1,
              version: text_liveblocks.get("content").version + 1,
            },
            focus: {
              nodeId: textNodeId!,
              type: "text",
              offset: 1,
              version: text_liveblocks.get("content").version + 1,
            },
          })
        ).toBeNull();
      });
    });

    test("returns null when the point type does not match the storage node", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;

      editor.read(() => {
        expect(
          manager.$decodePoint({
            nodeId: paragraph_liveblocks[kInternal].getId()!,
            type: "text",
            offset: 0,
            version: 0,
          })
        ).toBeNull();
      });
    });

    test("returns null when the LiveText binding is empty", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText(),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.read(() => {
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([]);
        expect(
          manager.$decodePoint({
            nodeId: text_liveblocks[kInternal].getId()!,
            type: "text",
            offset: 0,
            version: text_liveblocks.get("content").version,
          })
        ).toBeNull();
      });
    });

    test("returns null when coalesced TextNode bindings are detached", async () => {
      // Simulates mid-reconcile / post-delete forward map still holding
      // TextNode refs whose keys are gone from the active editor state.
      // Decode must return null — not throw via getLatest().
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      let encoded: NonNullable<ReturnType<typeof manager.$encodeSelection>>;

      editor.update(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text.select(2, 2);
      });

      editor.read(() => {
        encoded = manager.$encodeSelection()!;
        expect(encoded).not.toBeNull();
      });

      // Detach the TextNode without refreshing bindings — same shape as a
      // remote-cursor decode racing a structural delete.
      editor.update(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text.remove();
      });

      editor.read(() => {
        expect(() => manager.$decodeSelection(encoded!)).not.toThrow();
        expect(manager.$decodeSelection(encoded!)).toBeNull();
      });
    });

    test("returns null when element bindings are detached", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      let encoded: NonNullable<ReturnType<typeof manager.$encodePoint>>;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ElementNode;
        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 0, "element");
        selection.focus.set(paragraph.getKey(), 0, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        const selection = manager.$encodeSelection();
        expect(selection).not.toBeNull();
        encoded = selection!.anchor;
      });

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ElementNode;
        paragraph.remove();
      });

      editor.read(() => {
        expect(() => manager.$decodePoint(encoded!)).not.toThrow();
        expect(manager.$decodePoint(encoded!)).toBeNull();
      });
    });

    test("keeps a coalesced segment-boundary offset on the earlier TextNode", async () => {
      // flatOffset === size of first TextNode must decode to the END of t0,
      // not the start of t1 — locks the `>` (not `>=`) walk in $decodeTextPoint.
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText([
                      ["Hello ", { bold: true }],
                      ["world"],
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        expect(textNodes).toHaveLength(2);
        expect(textNodes[0]!.getTextContentSize()).toBe(6);
        // Caret at end of "Hello " (local offset 6) → flat LiveText offset 6.
        textNodes[0]!.select(6, 6);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = paragraph
          .getChildren()
          .filter($isTextNode) as TextNode[];
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(encoded!.anchor.offset).toBe(6);

        const decoded = manager.$decodeSelection(encoded!);
        expect(decoded).toEqual({
          anchor: {
            key: textNodes[0]!.getKey(),
            offset: 6,
            type: "text",
          },
          focus: {
            key: textNodes[0]!.getKey(),
            offset: 6,
            type: "text",
          },
        });
      });
    });

    test("round-trips through encodeIndex/decodeIndex after a local pending insert", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const liveText = text_liveblocks.get("content");

      // Local pending insert at 0: local doc is "XHello", confirmed still "Hello".
      liveText.insert(0, "X");

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.setTextContent(liveText.toString());
        // Caret after pending "X" (local offset 1).
        text_lexical.select(1, 1);
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        // Presence carries confirmed coords (offset 0).
        expect(encoded!.anchor.offset).toBe(0);

        // decodeIndex remaps confirmed 0 → local 1 (after the pending insert).
        const decoded = manager.$decodeSelection(encoded!);
        expect(decoded).toEqual({
          anchor: { key: text_lexical.getKey(), offset: 1, type: "text" },
          focus: { key: text_lexical.getKey(), offset: 1, type: "text" },
        });
      });
    });

    test("round-trips a range spanning two root paragraphs", async () => {
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("One"),
                  }),
                ]),
              }),
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList<LiveTextNode>([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Two"),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraphs = $dfs()
          .filter(({ node }) => $isParagraphNode(node))
          .map(({ node }) => node as ParagraphNode);
        const firstText = paragraphs[0]!
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        const secondText = paragraphs[1]!
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        const selection = $createRangeSelection();
        selection.anchor.set(firstText.getKey(), 1, "text");
        selection.focus.set(secondText.getKey(), 2, "text");
        $setSelection(selection);
      });

      editor.read(() => {
        const paragraphs = $dfs()
          .filter(({ node }) => $isParagraphNode(node))
          .map(({ node }) => node as ParagraphNode);
        const firstText = paragraphs[0]!
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        const secondText = paragraphs[1]!
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();
        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: firstText.getKey(), offset: 1, type: "text" },
          focus: { key: secondText.getKey(), offset: 2, type: "text" },
        });
      });
    });

    test("round-trips a mixed text + element selection across a linebreak", async () => {
      // Anchor in text, focus as an element point after the text slot
      // (before the linebreak). Exercises encode/decode with different
      // endpoint types in one selection.
      const { room, root } = (await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document?: LiveRootNode }>;
      };

      room.batch(() => {
        root.set(
          "document",
          new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList<LiveElementNode>([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText("Hello"),
                  }),
                  new LiveObject({
                    kind: "linebreak",
                    type: "linebreak",
                    version: 1,
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;
      const text_liveblocks = (paragraph_liveblocks as LiveElementNode)
        .get("children")
        .get(0)! as LiveTextNode;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNode = paragraph
          .getChildren()
          .filter($isTextNode)[0] as TextNode;
        // Lexical: [Text "Hello", LineBreak] — element index 1 is before br.
        const selection = $createRangeSelection();
        selection.anchor.set(textNode.getKey(), 2, "text");
        selection.focus.set(paragraph.getKey(), 1, "element");
        $setSelection(selection);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNode = paragraph
          .getChildren()
          .filter($isTextNode)[0] as TextNode;

        const encoded = manager.$encodeSelection();
        expect(encoded).toEqual({
          anchor: {
            nodeId: text_liveblocks[kInternal].getId(),
            type: "text",
            offset: 2,
            version: text_liveblocks.get("content").version,
          },
          focus: {
            nodeId: paragraph_liveblocks[kInternal].getId(),
            type: "element",
            offset: 1,
            version: 0,
          },
        });

        expect(manager.$decodeSelection(encoded!)).toEqual({
          anchor: { key: textNode.getKey(), offset: 2, type: "text" },
          focus: { key: paragraph.getKey(), offset: 1, type: "element" },
        });
      });
    });
  });

  describe("$reconcileTextNode", () => {
    test("is a no-op on LiveText when content already matches", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const contentBefore = text_liveblocks.get("content").toJSON();

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        manager.$reconcileTextNodeFromLexical([text_lexical], text_liveblocks);

        expect(text_liveblocks.get("content").toJSON()).toEqual(contentBefore);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([
          text_lexical,
        ]);
        expect(manager.binding.reverse.get(text_lexical.getKey())).toBe(
          text_liveblocks
        );
      });
    });

    test("uses a single LiveText replace when content changes", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("First pasted");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const replaceSpy = vi.spyOn(liveText, "replace");
        const deleteSpy = vi.spyOn(liveText, "delete");
        const insertSpy = vi.spyOn(liveText, "insert");
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        manager.$reconcileTextNodeFromLexical([text_lexical], text_liveblocks);

        expect(replaceSpy).toHaveBeenCalledTimes(1);
        expect(deleteSpy).not.toHaveBeenCalled();
        expect(insertSpy).not.toHaveBeenCalled();
        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["First pasted"],
        ]);
      });
    });

    test("clears LiveText when Lexical text is emptied", () => {
      const document = createParagraphDocument("Delete me");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical([], text_liveblocks);

        expect(text_liveblocks.get("content").toJSON()).toEqual([]);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([]);
      });
    });

    test("synchronizes bold formatting when plain text already matches", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(1);
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(
          [text_lexical.getLatest()],
          text_liveblocks
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { bold: true }],
        ]);
      });
    });

    test("updates LiveText when content changes in the middle", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hi world!");
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(
          [text_lexical.getLatest()],
          text_liveblocks
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hi world!"],
        ]);
      });
    });

    test("appends text to LiveText", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hello world!");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest()),
          text_liveblocks
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!"],
        ]);
      });
    });

    test("syncs coalesced sibling TextNodes into LiveText segments", () => {
      const document = createParagraphDocument("Hello world");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        paragraph.clear();
        const bold = $createTextNode("Hello ");
        bold.toggleFormat("bold");
        paragraph.append(bold, $createTextNode("world"));
      });

      editor.read(() => {
        const textNodes = $dfs()
          .map(({ node }) => node)
          .filter($isTextNode)
          .map((node) => node.getLatest());
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(textNodes, text_liveblocks);

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello ", { bold: true }],
          ["world"],
        ]);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual(textNodes);
      });
    });

    test("splits LiveText when one TextNode becomes two siblings with the same plain text", () => {
      const document = createParagraphDocument("Hello world");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const [, second] = text.splitText(6);
        second.toggleFormat("bold");
      });

      editor.read(() => {
        const textNodes = $dfs()
          .map(({ node }) => node)
          .filter($isTextNode)
          .map((node) => node.getLatest());
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(textNodes, text_liveblocks);

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello "],
          ["world", { bold: true }],
        ]);
      });
    });

    test("keeps plain text when one TextNode is split into two unformatted siblings", () => {
      const document = createParagraphDocument("Hello world");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text.splitText(6);
      });

      editor.read(() => {
        const textNodes = $dfs()
          .map(({ node }) => node)
          .filter($isTextNode)
          .map((node) => node.getLatest());
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(textNodes, text_liveblocks);

        const segments = text_liveblocks.get("content").toJSON();
        expect(segments.map((segment) => segment[0]).join("")).toBe(
          "Hello world"
        );
        // LiveText may coalesce same-format spans into one segment (unlike Yjs
        // deltas, which stay 1:1 with TextNodes via the `i` attribute).
        expect(segments.length).toBeLessThanOrEqual(2);
      });
    });

    test("synchronizes mode when plain text already matches", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setMode("token");
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(
          [text_lexical.getLatest()],
          text_liveblocks
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { mode: "token" }],
        ]);
      });
    });

    test("synchronizes style when plain text already matches", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setStyle("color: red");
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.$reconcileTextNodeFromLexical(
          [text_lexical.getLatest()],
          text_liveblocks
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { style: "color: red" }],
        ]);
      });
    });

    test("uses a minimal LiveText replace when inserting in the middle", () => {
      const document = createParagraphDocument("Hello world");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hello Xworld");
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const replaceSpy = vi.spyOn(liveText, "replace");

        manager.$reconcileTextNodeFromLexical(
          [text_lexical.getLatest()],
          text_liveblocks
        );

        expect(replaceSpy).toHaveBeenCalledTimes(1);
        expect(replaceSpy).toHaveBeenCalledWith(6, 0, "X", undefined);
        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello Xworld"],
        ]);
      });
    });

    test("clears LiveText when all Lexical text nodes are detached", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      let detached: TextNode;
      editor.update(() => {
        detached = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        detached.remove();
      });

      editor.read(() => {
        manager.$reconcileTextNodeFromLexical([detached!], text_liveblocks);

        expect(text_liveblocks.get("content").toJSON()).toEqual([]);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([]);
      });
    });
  });

  describe("$reconcileElementNodeFromLexical", () => {
    test("is a no-op when element children already match", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;
      const childrenBefore = paragraph_liveblocks.get("children").length;

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ElementNode;

        manager.$reconcileElementNodeFromLexical(
          paragraph_lexical,
          paragraph_liveblocks,
          new Set()
        );

        expect(paragraph_liveblocks.get("children").length).toBe(
          childrenBefore
        );
        expect(
          (paragraph_liveblocks.get("children").get(0)! as LiveTextNode)
            .get("content")
            .toJSON()
        ).toEqual([["Hello world!"]]);
      });
    });

    test("syncs element type and props onto the storage node", () => {
      const document = createParagraphDocument("Title");
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;

      editor.update(
        () => {
          const heading = $createHeadingNode("h2");
          heading.append(
            ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
          );
          ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
        },
        { discrete: true }
      );

      editor.read(() => {
        manager.$reconcileElementNodeFromLexical(
          $getRoot().getFirstChild() as ElementNode,
          paragraph_liveblocks,
          new Set([$getRoot().getFirstChild()!.getKey()])
        );
      });

      expect(paragraph_liveblocks.get("type")).toBe("heading");
      expect(paragraph_liveblocks.get("props")?.toJSON()).toEqual({
        tag: "h2",
      });
    });

    test("does not treat storage with extra children as structurally equal", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      paragraph_liveblocks.get("children").push(
        new LiveObject({
          kind: "linebreak",
          type: "linebreak",
          version: 1,
        }) as LiveLineBreakNode
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ElementNode;
        expect(() => {
          manager.$reconcileElementNodeFromLexical(
            paragraph_lexical,
            paragraph_liveblocks,
            new Set()
          );
        }).not.toThrow();
      });
    });
  });

  describe("$applyLocalUpdates", () => {
    test("syncs append typing to LiveText", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);
      const text_liveblocks = document
        .get("children")
        .get(0)!
        .get("children")
        .get(0)! as LiveTextNode;

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      for (const char of " world!") {
        editor.update(
          () => {
            const text = (
              $getRoot().getFirstChild() as ParagraphNode
            ).getFirstChild()!;
            const selection = text.selectEnd();
            if (!$isRangeSelection(selection)) {
              throw new Error("expected range selection");
            }
            selection.insertText(char);
          },
          { discrete: true }
        );
      }
      unregister();

      expect(text_liveblocks.get("content").toJSON()).toEqual([
        ["Hello world!"],
      ]);
    });

    test("inserts a new paragraph at the end of the root", () => {
      const document = createParagraphDocument("One");
      const { editor, manager } = createEditor(document);

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode("Two"))
          );
        },
        { discrete: true }
      );
      unregister();

      expect(document.get("children").length).toBe(2);
      expect(
        (
          document
            .get("children")
            .get(1)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["Two"]]);
    });

    test("preserves document order when inserting multiple paragraphs at once", () => {
      const document = createParagraphDocument("");
      const { editor, manager } = createEditor(document);

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          root.append(
            $createParagraphNode().append($createTextNode("P1")),
            $createParagraphNode().append($createTextNode("P2")),
            $createParagraphNode().append($createTextNode("P3"))
          );
        },
        { discrete: true }
      );
      unregister();

      const children = document.get("children");
      expect(children.length).toBe(3);
      expect(
        (children.get(0)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P1"]]);
      expect(
        (children.get(1)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P2"]]);
      expect(
        (children.get(2)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P3"]]);
    });

    test("preserves document order when appending multiple paragraphs at once", () => {
      const document = createParagraphDocument("P1");
      const { editor, manager } = createEditor(document);

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode("P2")),
            $createParagraphNode().append($createTextNode("P3")),
            $createParagraphNode().append($createTextNode("P4"))
          );
        },
        { discrete: true }
      );
      unregister();

      const children = document.get("children");
      expect(children.length).toBe(4);
      expect(
        (children.get(0)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P1"]]);
      expect(
        (children.get(1)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P2"]]);
      expect(
        (children.get(2)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P3"]]);
      expect(
        (children.get(3)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P4"]]);
    });

    test("preserves document order when inserting multiple paragraphs in the middle", () => {
      const document = createParagraphDocument("P1");
      const { editor, manager } = createEditor(document);

      const unregisterAppend = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode("P4"))
          );
        },
        { discrete: true }
      );
      unregisterAppend();

      const unregisterInsert = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const midA = $createParagraphNode().append($createTextNode("P2"));
          const midB = $createParagraphNode().append($createTextNode("P3"));
          $getRoot().getChildAtIndex(1)!.insertBefore(midA);
          midA.insertAfter(midB);
        },
        { discrete: true }
      );
      unregisterInsert();

      const children = document.get("children");
      expect(children.length).toBe(4);
      expect(
        (children.get(0)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P1"]]);
      expect(
        (children.get(1)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P2"]]);
      expect(
        (children.get(2)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P3"]]);
      expect(
        (children.get(3)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["P4"]]);
    });

    test("syncs insertText after clearing all content", () => {
      const document = createParagraphDocument("Hello world");
      const { editor, manager } = createEditor(document);

      const dirtyRoots: boolean[] = [];
      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          dirtyRoots.push(dirtyElements.has("root"));
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        },
        { discrete: true }
      );

      for (const char of "Hi") {
        editor.update(
          () => {
            const paragraph = $getRoot().getFirstChild() as ParagraphNode;
            const selection = paragraph.selectEnd();
            if (!$isRangeSelection(selection)) {
              throw new Error("expected range selection");
            }
            selection.insertText(char);
          },
          { discrete: true }
        );
      }
      unregister();

      expect(dirtyRoots.every(Boolean)).toBe(true);
      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["Hi"]]);
    });

    test("syncs typing into a pasted blank paragraph", () => {
      const document = createParagraphDocument("A");
      const { editor, manager } = createEditor(document);

      const sync = (fn: () => void) => {
        const unregister = editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        editor.update(fn, { discrete: true });
        unregister();
      };

      sync(() => {
        $getRoot().append(
          $createParagraphNode(),
          $createParagraphNode().append($createTextNode("B"))
        );
      });

      expect(document.get("children").get(1)!.get("children").length).toBe(0);

      sync(() => {
        ($getRoot().getChildAtIndex(1) as ParagraphNode).append(
          $createTextNode("MID")
        );
      });

      expect(document.get("children").get(1)!.get("children").length).toBe(1);
      expect(
        (
          document
            .get("children")
            .get(1)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["MID"]]);
    });

    test("syncs typing into a pasted empty paragraph after delete-all", () => {
      const document = createParagraphDocument("Keep");
      const { editor, manager } = createEditor(document);

      const sync = (fn: () => void) => {
        const unregister = editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        editor.update(fn, { discrete: true });
        unregister();
      };

      // Simulate paste with blank line → empty paragraph (no text child in Lexical)
      sync(() => {
        $getRoot().append(
          $createParagraphNode(),
          $createParagraphNode().append($createTextNode("Tail"))
        );
      });

      expect(document.get("children").get(1)!.get("children").length).toBe(0);

      sync(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });

      // Whatever storage shape delete-all left, typing must sync again.
      sync(() => {
        ($getRoot().getFirstChild() as ParagraphNode).append(
          $createTextNode("Recovered")
        );
      });

      const children = document.get("children");
      expect(children.length).toBe(1);
      expect(children.get(0)!.get("children").length).toBe(1);
      expect(
        (children.get(0)!.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([["Recovered"]]);
    });

    test("retains empty LiveText after deleting all paragraphs", () => {
      const document = createParagraphDocument("P1");
      const { editor, manager } = createEditor(document);

      const sync = (fn: () => void) => {
        const unregister = editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        editor.update(fn, { discrete: true });
        unregister();
      };

      sync(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode("P2")),
          $createParagraphNode().append($createTextNode("P3"))
        );
      });

      sync(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });

      expect(document.get("children").length).toBe(1);
      const paragraph = document.get("children").get(0)!;
      expect(paragraph.get("children").length).toBe(1);
      expect(paragraph.get("children").get(0)!.get("kind")).toBe("text");
      expect(
        (paragraph.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([]);
      expect(manager.binding.reverse.size).toBeGreaterThan(0);

      sync(() => {
        ($getRoot().getFirstChild() as ParagraphNode).append(
          $createTextNode("After delete")
        );
      });

      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["After delete"]]);
    });

    test("keeps an empty LiveText child after select-all delete", () => {
      const document = createParagraphDocument("Hello world");
      const { editor, manager } = createEditor(document);

      const sync = (fn: () => void) => {
        const unregister = editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        editor.update(fn, { discrete: true });
        unregister();
      };

      // Multi-paragraph then select-all style clear to a single empty paragraph
      sync(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode("Second"))
        );
      });

      sync(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });

      expect(document.get("children").length).toBe(1);
      const paragraph = document.get("children").get(0)!;
      expect(paragraph.get("children").length).toBe(1);
      expect(paragraph.get("children").get(0)!.get("kind")).toBe("text");
      expect(
        (paragraph.get("children").get(0) as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([]);

      sync(() => {
        ($getRoot().getFirstChild() as ParagraphNode).append(
          $createTextNode("Again")
        );
      });

      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["Again"]]);
    });

    test("survives clearing the document then typing", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const sync = (fn: () => void) => {
        const unregister = editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        editor.update(fn, { discrete: true });
        unregister();
      };

      sync(() => {
        $getRoot().clear();
        $getRoot().append($createParagraphNode());
      });

      expect(document.get("children").length).toBe(1);
      expect(manager.binding.reverse.size).toBeGreaterThan(0);

      sync(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        paragraph.append($createTextNode("After"));
      });

      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["After"]]);
    });

    test("survives emptying the root then appending a paragraph", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const sync = (fn: () => void) => {
        const unregister = editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        editor.update(fn, { discrete: true });
        unregister();
      };

      sync(() => {
        $getRoot().clear();
      });

      expect(document.get("children").length).toBe(0);
      expect(manager.binding.reverse.size).toBeGreaterThan(0);

      sync(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode("After"))
        );
      });

      expect(document.get("children").length).toBe(1);
      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["After"]]);
    });

    test("deletes a root paragraph when Lexical removes it", () => {
      const document = createParagraphDocument("One");
      const { editor, manager } = createEditor(document);

      const unregisterInsert = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode("Two"))
          );
        },
        { discrete: true }
      );
      unregisterInsert();

      const unregisterDelete = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const paragraphs = $getRoot().getChildren();
          paragraphs[1]!.remove();
        },
        { discrete: true }
      );
      unregisterDelete();

      expect(document.get("children").length).toBe(1);
      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["One"]]);
    });

    test("inserts a paragraph between existing root children", () => {
      const document = createParagraphDocument("One");
      const { editor, manager } = createEditor(document);

      const unregisterAppend = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode("Three"))
          );
        },
        { discrete: true }
      );
      unregisterAppend();

      const unregisterInsert = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const second = $createParagraphNode().append($createTextNode("Two"));
          $getRoot().getChildAtIndex(1)!.insertBefore(second);
        },
        { discrete: true }
      );
      unregisterInsert();

      expect(document.get("children").length).toBe(3);
      expect(
        (
          document
            .get("children")
            .get(0)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["One"]]);
      expect(
        (
          document
            .get("children")
            .get(1)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["Two"]]);
      expect(
        (
          document
            .get("children")
            .get(2)!
            .get("children")
            .get(0)! as LiveTextNode
        )
          .get("content")
          .toJSON()
      ).toEqual([["Three"]]);
    });

    test("replaces a root storage child when the Lexical node type changes", () => {
      const document = createParagraphDocument("Title");
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          const heading = $createHeadingNode("h1");
          heading.append(...paragraph.getChildren());
          paragraph.replace(heading);
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        const heading_lexical = $getRoot().getFirstChild() as ElementNode;

        const rootChild = document.get("children").get(0)!;
        expect(rootChild).not.toBe(paragraph_liveblocks);
        expect(rootChild.get("type")).toBe("heading");
        expect(
          (rootChild.get("children").get(0)! as LiveTextNode)
            .get("content")
            .toJSON()
        ).toEqual([["Title"]]);
        expect(manager.binding.reverse.get(heading_lexical.getKey())).toBe(
          rootChild
        );
      });
    });

    test("preserves bindings for unchanged prefix and suffix root children", () => {
      const document: LiveRootNode = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("A"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("B"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("C"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);
      const first_liveblocks = document.get("children").get(0)!;
      const third_liveblocks = document.get("children").get(2)!;

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const middle = $dfs().find(
            ({ node }) =>
              $isParagraphNode(node) && node.getTextContent() === "B"
          )!.node as ParagraphNode;
          middle.remove();
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        const first_lexical = $getRoot().getChildAtIndex(0) as ElementNode;
        const second_lexical = $getRoot().getChildAtIndex(1) as ElementNode;

        expect(document.get("children").length).toBe(2);
        expect(
          (
            document
              .get("children")
              .get(0)!
              .get("children")
              .get(0)! as LiveTextNode
          )
            .get("content")
            .toJSON()
        ).toEqual([["A"]]);
        expect(
          (
            document
              .get("children")
              .get(1)!
              .get("children")
              .get(0)! as LiveTextNode
          )
            .get("content")
            .toJSON()
        ).toEqual([["C"]]);
        expect(manager.binding.forward.get(first_liveblocks)).toBe(
          first_lexical
        );
        expect(manager.binding.forward.get(third_liveblocks)).toBe(
          second_lexical
        );
        expect(manager.binding.reverse.get(first_lexical.getKey())).toBe(
          first_liveblocks
        );
        expect(manager.binding.reverse.get(second_lexical.getKey())).toBe(
          third_liveblocks
        );
      });
    });

    test("rebinds structurally equal storage children after Lexical node recreation", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);
      const paragraph_liveblocks = document.get("children").get(0)!;
      const text_liveblocks = paragraph_liveblocks
        .get("children")
        .get(0)! as LiveTextNode;

      const unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
          editorState.read(() => {
            manager.$applyLocalUpdates({
              dirtyElements: new Set(dirtyElements.keys()),
              dirtyLeaves,
              normalizedNodes,
            });
          });
        }
      );

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          const recreated = $createParagraphNode().append(
            $createTextNode("Hello")
          );
          paragraph.replace(recreated);
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        const recreated = $getRoot().getFirstChild() as ParagraphNode;
        const text_lexical = recreated.getFirstChild() as TextNode;

        expect(manager.binding.forward.get(paragraph_liveblocks)).toBe(
          recreated.getLatest()
        );
        expect(manager.binding.reverse.get(recreated.getKey())).toBe(
          paragraph_liveblocks
        );
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([
          text_lexical,
        ]);
        expect(manager.binding.reverse.get(text_lexical.getKey())).toBe(
          text_liveblocks
        );
      });
    });
  });

  describe("$getLexicalNodeProps", () => {
    test("returns undefined for a default paragraph", () => {
      const document = createParagraphDocument("Hello");
      const { editor } = createEditor(document);

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;

        expect($getLexicalNodeProps(paragraph)).toBeUndefined();
      });
    });

    test("returns the heading tag for heading elements", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h3");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h3" });
      });
    });

    test("includes the default h1 tag rather than omitting it", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h1");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h1" });
      });
    });

    test("returns undefined for quote elements with no custom fields", () => {
      const document = createParagraphDocument("Quoted");
      const { editor } = createEditor(document);

      editor.update(() => {
        const quote = new QuoteNode();
        quote.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(quote);
      });

      editor.read(() => {
        const quote = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(quote)).toBeUndefined();
      });
    });

    test("omits layout fields that live outside storage props", () => {
      const document = createParagraphDocument("Indented");
      const { editor } = createEditor(document);

      editor.update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        paragraph.setIndent(2);
        paragraph.setFormat("center");
        paragraph.setDirection("rtl");
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;

        expect(paragraph.getIndent()).toBe(2);
        expect(paragraph.getFormatType()).toBe("center");
        expect(paragraph.getDirection()).toBe("rtl");
        expect($getLexicalNodeProps(paragraph)).toBeUndefined();
      });
    });

    test("returns undefined for non-element nodes", () => {
      const document = createParagraphDocument("Hello");
      const { editor } = createEditor(document);

      editor.read(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        expect($getLexicalNodeProps(text)).toBeUndefined();
      });
    });
  });

  describe("$setLexicalNodeProps", () => {
    test("applies storage props onto a heading element", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h1");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      editor.update(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        $setLexicalNodeProps(heading, { tag: "h2" });
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect(heading.getType()).toBe("heading");
        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h2" });
      });
    });

    test("preserves layout fields when only custom props change", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h1");
        heading.setIndent(3);
        heading.setFormat("right");
        heading.setDirection("ltr");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      editor.update(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        $setLexicalNodeProps(heading, { tag: "h4" });
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h4" });
        expect(heading.getIndent()).toBe(3);
        expect(heading.getFormatType()).toBe("right");
        expect(heading.getDirection()).toBe("ltr");
        expect(heading.getTextContent()).toBe("Title");
      });
    });

    test("resets custom props to type defaults when props is undefined", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h1");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      editor.update(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        $setLexicalNodeProps(heading, { tag: "h3" });
      });

      editor.update(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        $setLexicalNodeProps(heading, undefined);
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h1" });
      });
    });

    test("keeps layout fields when props is undefined on a paragraph", () => {
      const document = createParagraphDocument("Indented");
      const { editor } = createEditor(document);

      editor.update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        paragraph.setIndent(1);
        paragraph.setFormat("center");
      });

      editor.update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        $setLexicalNodeProps(paragraph, undefined);
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;

        expect($getLexicalNodeProps(paragraph)).toBeUndefined();
        expect(paragraph.getIndent()).toBe(1);
        expect(paragraph.getFormatType()).toBe("center");
      });
    });

    test("does not clear undeclared custom props when given an empty props object", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h1");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      editor.update(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        $setLexicalNodeProps(heading, { tag: "h2" });
      });

      editor.update(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        $setLexicalNodeProps(heading, {});
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h2" });
      });
    });

    test("is a no-op for non-element nodes", () => {
      const document = createParagraphDocument("Hello");
      const { editor } = createEditor(document);

      editor.update(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        $setLexicalNodeProps(text, { tag: "h1" });
      });

      editor.read(() => {
        const text = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        expect(text.getTextContent()).toBe("Hello");
        expect($getLexicalNodeProps(text)).toBeUndefined();
      });
    });
  });

  describe("$getLexicalNodeProps / $setLexicalNodeProps round-trip", () => {
    test("round-trips heading props through get and set", () => {
      const document = createParagraphDocument("Title");
      const { editor } = createEditor(document);

      editor.update(() => {
        const heading = $createHeadingNode("h2");
        heading.append(
          ...($getRoot().getFirstChild() as ParagraphNode).getChildren()
        );
        ($getRoot().getFirstChild() as ParagraphNode).replace(heading);
      });

      let props: ReturnType<typeof $getLexicalNodeProps>;

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        props = $getLexicalNodeProps(heading);
      });

      editor.update(() => {
        const heading = $createHeadingNode("h1");
        heading.append($createTextNode("Other"));
        $getRoot().clear();
        $getRoot().append(heading);
        $setLexicalNodeProps(heading, props);
      });

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;

        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h2" });
        expect(heading.getTextContent()).toBe("Other");
      });
    });

    test("matches storage props used by element structural equality", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "heading",
            version: 1,
            props: new LiveMap<string, Json>([["tag", "h2"]]),
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Title"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor } = createEditor(document);

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        const props_liveblocks = document.get("children").get(0)!.get("props");

        expect($getLexicalNodeProps(heading)).toEqual(
          props_liveblocks?.toJSON()
        );
      });
    });
  });

  describe("$reconcileTextNodeFromLiveblocks", () => {
    test("is a no-op on Lexical when content already matches", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        manager.$reconcileTextNodeFromLiveblocks(
          [text_lexical],
          text_liveblocks
        );

        expect(text_lexical.getTextContent()).toBe("Hello world!");
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([
          text_lexical,
        ]);
      });
    });

    test("updates Lexical text when LiveText content changes", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      text_liveblocks.get("content").replace(0, 5, "Hello!");

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        manager.$reconcileTextNodeFromLiveblocks(
          [text_lexical],
          text_liveblocks
        );
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        expect(text_lexical.getTextContent()).toBe("Hello!");
      });
    });

    test("synchronizes bold formatting when plain text already matches", () => {
      const document = createParagraphDocument("Hello world!");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      text_liveblocks.get("content").format(0, 12, { bold: true });

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        manager.$reconcileTextNodeFromLiveblocks(
          [text_lexical],
          text_liveblocks
        );
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        expect(text_lexical.getFormat()).toBe(1);
      });
    });

    test("removes Lexical TextNodes when LiveText is emptied", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      text_liveblocks.get("content").delete(0, 5);

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        manager.$reconcileTextNodeFromLiveblocks(
          [text_lexical],
          text_liveblocks
        );
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(0);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([]);
      });
    });

    test("inserts TextNodes when LiveText gains content from an empty binding", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      text_liveblocks.get("content").delete(0, 5);

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        manager.$reconcileTextNodeFromLiveblocks(
          [text_lexical],
          text_liveblocks
        );
      });

      text_liveblocks.get("content").insert(0, "Again");

      editor.update(() => {
        manager.$reconcileTextNodeFromLiveblocks([], text_liveblocks);
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(1);
        expect(paragraph.getTextContent()).toBe("Again");
        expect(manager.binding.forward.get(text_liveblocks)).toHaveLength(1);
      });
    });
  });

  describe("$applyRemoteUpdates", () => {
    test("ignores local storage updates", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const content = text_liveblocks.get("content");
      content.replace(0, 5, "Changed");

      editor.update(() => {
        manager.$applyRemoteUpdates([
          {
            type: "LiveText",
            node: content,
            version: content.version,
            updates: [
              {
                type: "delete",
                index: 0,
                length: 5,
                deletedText: "Hello",
              },
              {
                type: "insert",
                index: 0,
                text: "Changed",
              },
            ],
            [kStorageUpdateSource]: { origin: "local", via: "mutation" },
          },
        ]);
      });

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        expect(text_lexical.getTextContent()).toBe("Hello");
      });
    });

    test("applies remote LiveText updates to Lexical", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const content = text_liveblocks.get("content");
      content.replace(0, 5, "Hello!");

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: content,
              version: content.version,
              updates: [
                {
                  type: "delete",
                  index: 5,
                  length: 0,
                  deletedText: "",
                },
                {
                  type: "insert",
                  index: 5,
                  text: "!",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        expect(text_lexical.getTextContent()).toBe("Hello!");
      });
    });

    test("ignores local LiveList inserts", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const paragraph_liveblocks = new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText("Remote"),
          }),
        ]),
      }) as LiveElementNode;
      children_liveblocks.insert(paragraph_liveblocks, 1);

      editor.update(() => {
        manager.$applyRemoteUpdates([
          {
            type: "LiveList",
            node: children_liveblocks,
            updates: [
              {
                type: "insert",
                index: 1,
                item: paragraph_liveblocks,
              },
            ],
            [kStorageUpdateSource]: { origin: "local", via: "mutation" },
          },
        ]);
      });

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
      });
    });

    test("applies remote LiveList insert at root", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const paragraph_liveblocks = new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText("Remote"),
          }),
        ]),
      }) as LiveElementNode;
      children_liveblocks.insert(paragraph_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: paragraph_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(2);
        expect($getRoot().getChildAtIndex(1)?.getTextContent()).toBe("Remote");
        expect(manager.binding.forward.get(paragraph_liveblocks)).toBeDefined();
      });
    });

    test("maps storage child index to lexical splice index for coalesced text", () => {
      const textContent = new LiveText();
      textContent.insert(0, "Hello ", { bold: true });
      textContent.insert(6, "world");

      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: textContent,
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(2);
      });

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(3);
        expect(paragraph_lexical.getTextContent()).toBe("Hello world\n");
        expect(paragraph_lexical.getChildAtIndex(2)?.getType()).toBe(
          "linebreak"
        );
      });
    });

    test("ignores local LiveList deletes", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("One"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Two"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const deletedParagraph = children_liveblocks.get(1)!;
      children_liveblocks.delete(1);

      editor.update(() => {
        manager.$applyRemoteUpdates([
          {
            type: "LiveList",
            node: children_liveblocks,
            updates: [
              {
                type: "delete",
                index: 1,
                deletedItem: deletedParagraph,
              },
            ],
            [kStorageUpdateSource]: { origin: "local", via: "mutation" },
          },
        ]);
      });

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(2);
      });
    });

    test("applies remote LiveText clear to an empty paragraph", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const content = text_liveblocks.get("content");
      content.delete(0, content.length);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: content,
              version: content.version,
              updates: [
                {
                  type: "delete",
                  index: 0,
                  length: 5,
                  deletedText: "Hello",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("");
        expect(
          ($getRoot().getFirstChild() as ParagraphNode).getChildrenSize()
        ).toBe(0);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([]);
      });

      // Empty binding is the canonical empty slot — remote insert materializes
      // TextNodes into the paragraph.
      content.insert(0, "Recovered");

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: content,
              version: content.version,
              updates: [
                {
                  type: "insert",
                  index: 0,
                  text: "Recovered",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("Recovered");
      });
    });

    test("treats empty LiveText as zero Lexical span when inserting a sibling", () => {
      const document = createParagraphDocument("Keep");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const empty_text = children_liveblocks.get(0) as LiveTextNode;
      empty_text.get("content").delete(0, 4);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: empty_text.get("content"),
              version: empty_text.get("content").version,
              updates: [
                {
                  type: "delete",
                  index: 0,
                  length: 4,
                  deletedText: "Keep",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect(
          ($getRoot().getFirstChild() as ParagraphNode).getChildrenSize()
        ).toBe(0);
        expect(manager.binding.forward.get(empty_text)).toEqual([]);
      });

      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(1);
        expect(paragraph.getChildAtIndex(0)?.getType()).toBe("linebreak");
        expect(manager.binding.forward.get(linebreak_liveblocks)).toBe(
          paragraph.getChildAtIndex(0)
        );
      });
    });

    test("does not remove Lexical siblings when deleting an empty LiveText", () => {
      const document = createParagraphDocument("Keep");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const empty_text = children_liveblocks.get(0) as LiveTextNode;
      empty_text.get("content").delete(0, 4);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: empty_text.get("content"),
              version: empty_text.get("content").version,
              updates: [
                {
                  type: "delete",
                  index: 0,
                  length: 4,
                  deletedText: "Keep",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect(
          ($getRoot().getFirstChild() as ParagraphNode).getChildrenSize()
        ).toBe(1);
      });

      children_liveblocks.delete(0);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "delete",
                  index: 0,
                  deletedItem: empty_text,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(1);
        expect(paragraph.getChildAtIndex(0)?.getType()).toBe("linebreak");
        expect(manager.binding.forward.get(empty_text)).toBeUndefined();
        expect(manager.binding.forward.get(linebreak_liveblocks)).toBeDefined();
      });
    });

    test("inserts text after a preceding sibling when filling an empty LiveText", () => {
      const document = createParagraphDocument("Keep");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const empty_text = children_liveblocks.get(0) as LiveTextNode;
      empty_text.get("content").delete(0, 4);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: empty_text.get("content"),
              version: empty_text.get("content").version,
              updates: [
                {
                  type: "delete",
                  index: 0,
                  length: 4,
                  deletedText: "Keep",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 0);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 0,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(1);
        expect(paragraph.getChildAtIndex(0)?.getType()).toBe("linebreak");
        expect(manager.binding.forward.get(empty_text)).toEqual([]);
      });

      empty_text.get("content").insert(0, "After");

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: empty_text.get("content"),
              version: empty_text.get("content").version,
              updates: [
                {
                  type: "insert",
                  index: 0,
                  text: "After",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph.getChildrenSize()).toBe(2);
        expect(paragraph.getChildAtIndex(0)?.getType()).toBe("linebreak");
        expect(paragraph.getChildAtIndex(1)?.getTextContent()).toBe("After");
        expect(manager.binding.forward.get(empty_text)).toHaveLength(1);
      });
    });

    test("preserves order when applying remote multi-paragraph insert", () => {
      const document = createParagraphDocument("P1");
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const p2 = new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText("P2"),
          }),
        ]),
      }) as LiveElementNode;
      const p3 = new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText("P3"),
          }),
        ]),
      }) as LiveElementNode;
      children_liveblocks.insert(p2, 1);
      children_liveblocks.insert(p3, 2);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                { type: "insert", index: 1, item: p2 },
                { type: "insert", index: 2, item: p3 },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(3);
        expect(
          $getRoot()
            .getChildren()
            .map((c) => c.getTextContent())
        ).toEqual(["P1", "P2", "P3"]);
      });
    });

    test("applies remote delete-all to a peer editor", () => {
      // Shared storage starts with three paragraphs. Client A clears the doc;
      // client B must apply the resulting remote LiveList deltas.
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Alpha"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Beta"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Gamma"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;

      const peer = createEditor(document);
      const local = createEditor(document);

      peer.editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(3);
        expect(
          $getRoot()
            .getChildren()
            .map((c) => c.getTextContent())
        ).toEqual(["Alpha", "Beta", "Gamma"]);
      });

      const children_liveblocks = document.get("children");
      const before = [
        children_liveblocks.get(0)!,
        children_liveblocks.get(1)!,
        children_liveblocks.get(2)!,
      ];

      const syncLocal = (fn: () => void) => {
        const unregister = local.editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              local.manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        local.editor.update(fn, { discrete: true });
        unregister();
      };

      syncLocal(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });

      // Storage should reflect the empty document.
      const afterChildren = document.get("children");
      expect(afterChildren.length).toBe(1);
      const afterParagraph = afterChildren.get(0)!;
      expect(afterParagraph.get("children").length).toBe(1);
      expect(
        (afterParagraph.get("children").get(0)! as LiveTextNode)
          .get("content")
          .toJSON()
      ).toEqual([]);
      // Helpful when diagnosing reuse vs replace of the first paragraph.
      expect(before.includes(afterParagraph)).toBeTypeOf("boolean");

      // Peer still has the old Lexical tree until remote updates are applied.
      peer.editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(3);
      });

      // Reconstruct the LiveList deltas a subscriber would see for delete-all
      // followed by inserting the empty paragraph. LiveList.clear emits
      // delete@0 for each item; then insert@0 for the replacement.
      const remaining = document.get("children").get(0)!;
      const wasReused = before.includes(remaining);
      const text_liveblocks = remaining.get("children").get(0) as LiveTextNode;

      peer.editor.update(
        () => {
          if (wasReused) {
            peer.manager.$applyRemoteUpdates([
              {
                type: "LiveList",
                node: children_liveblocks,
                updates: [
                  { type: "delete", index: 1, deletedItem: before[1]! },
                  { type: "delete", index: 1, deletedItem: before[2]! },
                ],
                [kStorageUpdateSource]: { origin: "remote" },
              },
              {
                type: "LiveText",
                node: text_liveblocks.get("content"),
                version: text_liveblocks.get("content").version,
                updates: [
                  {
                    type: "delete",
                    index: 0,
                    length: 5,
                    deletedText: "Alpha",
                  },
                ],
                [kStorageUpdateSource]: { origin: "remote" },
              },
            ]);
          } else {
            peer.manager.$applyRemoteUpdates([
              {
                type: "LiveList",
                node: children_liveblocks,
                updates: [
                  { type: "delete", index: 0, deletedItem: before[0]! },
                  { type: "delete", index: 0, deletedItem: before[1]! },
                  { type: "delete", index: 0, deletedItem: before[2]! },
                  { type: "insert", index: 0, item: remaining },
                ],
                [kStorageUpdateSource]: { origin: "remote" },
              },
            ]);
          }
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      peer.editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("");
      });
    });

    test("applies remote LiveText fill after remote delete-all", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Alpha"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Beta"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;

      const peer = createEditor(document);
      const local = createEditor(document);

      const children_liveblocks = document.get("children");
      const before = [children_liveblocks.get(0)!, children_liveblocks.get(1)!];

      const syncLocal = (fn: () => void) => {
        const unregister = local.editor.registerUpdateListener(
          ({ dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
            editorState.read(() => {
              local.manager.$applyLocalUpdates({
                dirtyElements: new Set(dirtyElements.keys()),
                dirtyLeaves,
                normalizedNodes,
              });
            });
          }
        );
        local.editor.update(fn, { discrete: true });
        unregister();
      };

      syncLocal(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });

      const remaining = document.get("children").get(0)!;
      const text_liveblocks = remaining.get("children").get(0) as LiveTextNode;

      peer.editor.update(
        () => {
          peer.manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [{ type: "delete", index: 1, deletedItem: before[1]! }],
              [kStorageUpdateSource]: { origin: "remote" },
            },
            {
              type: "LiveText",
              node: text_liveblocks.get("content"),
              version: text_liveblocks.get("content").version,
              updates: [
                {
                  type: "delete",
                  index: 0,
                  length: 5,
                  deletedText: "Alpha",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        { discrete: true, skipTransforms: true, tag: COLLABORATION_TAG }
      );

      peer.editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("");
      });

      // Local types into the empty paragraph
      syncLocal(() => {
        ($getRoot().getFirstChild() as ParagraphNode).append(
          $createTextNode("KeepMe")
        );
      });

      expect(text_liveblocks.get("content").toJSON()).toEqual([["KeepMe"]]);

      peer.editor.update(
        () => {
          peer.manager.$applyRemoteUpdates([
            {
              type: "LiveText",
              node: text_liveblocks.get("content"),
              version: text_liveblocks.get("content").version,
              updates: [
                {
                  type: "insert",
                  index: 0,
                  text: "KeepMe",
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        { discrete: true, skipTransforms: true, tag: COLLABORATION_TAG }
      );

      peer.editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("KeepMe");
      });
    });

    test("applies remote LiveList delete at root", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("One"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Two"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const deletedParagraph = children_liveblocks.get(1)!;
      children_liveblocks.delete(1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "delete",
                  index: 1,
                  deletedItem: deletedParagraph,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("One");
        expect(
          manager.binding.forward.get(deletedParagraph as LiveStorageNode)
        ).toBeUndefined();
      });
    });

    test("maps storage child index when deleting coalesced text", () => {
      const textContent = new LiveText();
      textContent.insert(0, "Hello ", { bold: true });
      textContent.insert(6, "world");

      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: textContent,
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(3);
      });

      children_liveblocks.delete(1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "delete",
                  index: 1,
                  deletedItem: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(2);
        expect(paragraph_lexical.getTextContent()).toBe("Hello world");
      });
    });

    test("ignores local LiveList moves", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("One"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Two"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const movedParagraph = children_liveblocks.get(0)!;
      children_liveblocks.move(0, 1);

      editor.update(() => {
        manager.$applyRemoteUpdates([
          {
            type: "LiveList",
            node: children_liveblocks,
            updates: [
              {
                type: "move",
                previousIndex: 0,
                index: 1,
                item: movedParagraph,
              },
            ],
            [kStorageUpdateSource]: { origin: "local", via: "mutation" },
          },
        ]);
      });

      editor.read(() => {
        expect($getRoot().getChildAtIndex(0)?.getTextContent()).toBe("One");
        expect($getRoot().getChildAtIndex(1)?.getTextContent()).toBe("Two");
      });
    });

    test("applies remote LiveList move at root", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("One"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Two"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Three"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const movedParagraph = children_liveblocks.get(0)!;
      children_liveblocks.move(0, 2);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "move",
                  previousIndex: 0,
                  index: 2,
                  item: movedParagraph,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(3);
        expect($getRoot().getChildAtIndex(0)?.getTextContent()).toBe("Two");
        expect($getRoot().getChildAtIndex(1)?.getTextContent()).toBe("Three");
        expect($getRoot().getChildAtIndex(2)?.getTextContent()).toBe("One");
        expect(manager.binding.forward.get(movedParagraph)).toBe(
          $getRoot().getChildAtIndex(2)
        );
      });
    });

    test("maps storage child index when moving coalesced text", () => {
      const textContent = new LiveText();
      textContent.insert(0, "Hello ", { bold: true });
      textContent.insert(6, "world");

      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: textContent,
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(3);
        expect(paragraph_lexical.getChildAtIndex(2)?.getType()).toBe(
          "linebreak"
        );
      });

      children_liveblocks.move(1, 0);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "move",
                  previousIndex: 1,
                  index: 0,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(3);
        expect(paragraph_lexical.getChildAtIndex(0)?.getType()).toBe(
          "linebreak"
        );
        expect(paragraph_lexical.getTextContent()).toBe("\nHello world");
      });
    });

    test("ignores local LiveList sets", () => {
      const document = createParagraphDocument("Hello");
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const oldParagraph = children_liveblocks.get(0)!;
      const newParagraph = new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText("Replaced"),
          }),
        ]),
      }) as LiveElementNode;
      children_liveblocks.set(0, newParagraph);

      editor.update(() => {
        manager.$applyRemoteUpdates([
          {
            type: "LiveList",
            node: children_liveblocks,
            updates: [
              {
                type: "set",
                index: 0,
                item: newParagraph,
              },
            ],
            [kStorageUpdateSource]: { origin: "local", via: "mutation" },
          },
        ]);
      });

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getRoot().getFirstChild()?.getTextContent()).toBe("Hello");
        expect(manager.binding.forward.get(oldParagraph)).toBeDefined();
      });
    });

    test("applies remote LiveList set at root", () => {
      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("One"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Two"),
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const children_liveblocks = document.get("children");
      const oldParagraph = children_liveblocks.get(1)!;
      const newParagraph = new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText("Replaced"),
          }),
        ]),
      }) as LiveElementNode;
      children_liveblocks.set(1, newParagraph);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "set",
                  index: 1,
                  item: newParagraph,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(2);
        expect($getRoot().getChildAtIndex(0)?.getTextContent()).toBe("One");
        expect($getRoot().getChildAtIndex(1)?.getTextContent()).toBe(
          "Replaced"
        );
        expect(
          manager.binding.forward.get(oldParagraph as LiveStorageNode)
        ).toBeUndefined();
        expect(manager.binding.forward.get(newParagraph)).toBe(
          $getRoot().getChildAtIndex(1)
        );
      });
    });

    test("maps storage child index when setting over coalesced text", () => {
      const textContent = new LiveText();
      textContent.insert(0, "Hello ", { bold: true });
      textContent.insert(6, "world");

      const document = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: textContent,
              }),
            ]),
          }),
        ]),
      }) as LiveRootNode;
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      const children_liveblocks = paragraph_liveblocks.get("children");
      const linebreak_liveblocks = new LiveObject({
        kind: "linebreak",
        type: "linebreak",
        version: 1,
      }) as LiveLineBreakNode;
      children_liveblocks.insert(linebreak_liveblocks, 1);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "insert",
                  index: 1,
                  item: linebreak_liveblocks,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(3);
      });

      const oldText = children_liveblocks.get(0)!;
      const replacement = new LiveObject({
        kind: "text",
        type: "text",
        version: 1,
        content: new LiveText("Hi"),
      }) as LiveTextNode;
      children_liveblocks.set(0, replacement);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveList",
              node: children_liveblocks,
              updates: [
                {
                  type: "set",
                  index: 0,
                  item: replacement,
                },
              ],
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const paragraph_lexical = $getRoot().getFirstChild() as ParagraphNode;
        expect(paragraph_lexical.getChildrenSize()).toBe(2);
        expect(paragraph_lexical.getChildAtIndex(0)?.getTextContent()).toBe(
          "Hi"
        );
        expect(paragraph_lexical.getChildAtIndex(1)?.getType()).toBe(
          "linebreak"
        );
        expect(
          manager.binding.forward.get(oldText as LiveStorageNode)
        ).toBeUndefined();
        expect(manager.binding.forward.get(replacement)).toEqual([
          paragraph_lexical.getChildAtIndex(0),
        ]);
      });
    });

    test("ignores local LiveObject prop updates", () => {
      const document = createParagraphDocument("Title");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      paragraph_liveblocks.set("type", "heading");
      paragraph_liveblocks.set("props", new LiveMap([["tag", "h2"]]));

      editor.update(() => {
        manager.$applyRemoteUpdates([
          {
            type: "LiveObject",
            node: paragraph_liveblocks,
            updates: {
              type: { type: "update" },
              props: { type: "update" },
            },
            [kStorageUpdateSource]: { origin: "local", via: "mutation" },
          },
        ]);
      });

      editor.read(() => {
        expect($getRoot().getFirstChild()?.getType()).toBe("paragraph");
      });
    });

    test("applies remote LiveObject type and props updates", () => {
      const document = createParagraphDocument("Title");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      paragraph_liveblocks.set("type", "heading");
      paragraph_liveblocks.set("props", new LiveMap([["tag", "h2"]]));

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveObject",
              node: paragraph_liveblocks,
              updates: {
                type: { type: "update" },
                props: { type: "update" },
              },
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        expect(heading.getType()).toBe("heading");
        expect(heading.getTextContent()).toBe("Title");
        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h2" });
        expect(manager.binding.forward.get(paragraph_liveblocks)).toBe(heading);
      });
    });

    test("applies remote LiveMap prop updates on an existing props map", () => {
      const document = createParagraphDocument("Title");
      const { editor, manager } = createEditor(document);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      paragraph_liveblocks.set("type", "heading");
      const props = new LiveMap<string, Json>([["tag", "h1"]]);
      paragraph_liveblocks.set("props", props);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveObject",
              node: paragraph_liveblocks,
              updates: {
                type: { type: "update" },
                props: { type: "update" },
              },
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      props.set("tag", "h3");

      editor.update(
        () => {
          manager.$applyRemoteUpdates([
            {
              type: "LiveMap",
              node: props,
              updates: {
                tag: { type: "update" },
              },
              [kStorageUpdateSource]: { origin: "remote" },
            },
          ]);
        },
        {
          discrete: true,
          skipTransforms: true,
          tag: COLLABORATION_TAG,
        }
      );

      editor.read(() => {
        const heading = $getRoot().getFirstChild() as ElementNode;
        expect(heading.getType()).toBe("heading");
        expect($getLexicalNodeProps(heading)).toEqual({ tag: "h3" });
      });
    });
  });

  describe("areTextNodesStructurallyEqual", () => {
    const editor = createLexicalEditor({
      namespace: "areTextNodesStructurallyEqual",
      nodes: [ParagraphNode, TextNode],
    });

    test("returns true when a single LiveText segment matches one TextNode", () => {
      const text_liveblocks = createLiveTextNode([["Hello world!"]]);
      const text_lexical = createTextNodes(editor, ["Hello world!"]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(true);
    });

    test("returns true for empty LiveText and an empty Lexical text slot", () => {
      expect(areTextNodesStructurallyEqual(createLiveTextNode([]), [])).toBe(
        true
      );
    });

    test("returns false for empty LiveText and a placeholder TextNode", () => {
      const placeholder = {
        getLatest: () => placeholder,
        getTextContent: () => "",
        getType: () => "text",
        getFormat: () => 0,
        getMode: () => "normal" as const,
        getDetail: () => 0,
        getStyle: () => "",
      } as TextNode;

      expect(
        areTextNodesStructurallyEqual(createLiveTextNode([]), [placeholder])
      ).toBe(false);
    });

    test("returns true for multiple matching segments and sibling TextNodes", () => {
      const text_liveblocks = createLiveTextNode([
        ["Hello ", { bold: true }],
        ["world"],
      ]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello ", bold: true },
        "world",
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(true);
    });

    test("returns true when mode and style match on a segment", () => {
      const text_liveblocks = createLiveTextNode([
        ["Hello", { mode: "token", style: "color: red" }],
      ]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello", mode: "token", style: "color: red" },
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(true);
    });

    test("returns false when plain text differs", () => {
      const text_liveblocks = createLiveTextNode([["Hello world!"]]);
      const text_lexical = createTextNodes(editor, ["Hello there!"]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });

    test("returns false when inline format differs", () => {
      const text_liveblocks = createLiveTextNode([["Hello world!"]]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello world!", bold: true },
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });

    test("returns false when segment count differs", () => {
      const text_liveblocks = createLiveTextNode([["Hello world"]]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello ", bold: true },
        "world",
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });

    test("returns false when mode differs", () => {
      const text_liveblocks = createLiveTextNode([["Hello"]]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello", mode: "token" },
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });

    test("returns false when style differs", () => {
      const text_liveblocks = createLiveTextNode([["Hello"]]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello", style: "color: red" },
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });

    test("returns false when LiveText is empty but Lexical has multiple TextNodes", () => {
      const text_liveblocks = createLiveTextNode([]);
      const text_lexical = createTextNodes(editor, [
        { text: "Hello ", bold: true },
        "world",
      ]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });

    test("returns false when empty LiveText is compared with a non-empty TextNode", () => {
      const text_liveblocks = createLiveTextNode([]);
      const text_lexical = createTextNodes(editor, ["Hello"]);

      expect(
        editor.read(() =>
          areTextNodesStructurallyEqual(text_liveblocks, text_lexical)
        )
      ).toBe(false);
    });
  });
});

function createParagraphDocument(text: string): LiveRootNode {
  return new LiveObject({
    kind: "root",
    type: "root",
    version: 1,
    children: new LiveList<LiveElementNode>([
      new LiveObject({
        kind: "element",
        type: "paragraph",
        version: 1,
        children: new LiveList<LiveTextNode>([
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText(text),
          }),
        ]),
      }),
    ]),
  }) as LiveRootNode;
}

function createEditor(document: LiveRootNode): {
  editor: LexicalEditor;
  manager: LiveblocksCollaborationManager;
} {
  const editor = createLexicalEditor({
    namespace: "test",
    nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
  });

  const manager = new LiveblocksCollaborationManager(document, editor);

  return { editor, manager };
}

function createLiveTextNode(
  segments: Array<[string] | [string, TextAttributes]>
): LiveTextNode {
  const content = new LiveText();
  let offset = 0;
  for (const segment of segments) {
    const [text, attributes] = segment;
    if (text.length === 0) {
      continue;
    }
    content.insert(
      offset,
      text,
      attributes !== undefined ? attributes : undefined
    );
    offset += text.length;
  }

  return new LiveObject({
    kind: "text",
    type: "text",
    version: 1,
    content,
  }) as LiveTextNode;
}

type TextNodeSpec = {
  text: string;
  bold?: boolean;
  mode?: TextModeType;
  style?: string;
};

function createTextNodes(
  editor: LexicalEditor,
  specs: Array<string | TextNodeSpec>
): TextNode[] {
  const keys: string[] = [];

  editor.update(() => {
    const root = $getRoot();
    root.clear();
    const paragraph = $createParagraphNode();
    root.append(paragraph);

    for (const spec of specs) {
      const node =
        typeof spec === "string"
          ? $createTextNode(spec)
          : $createTextNode(spec.text);

      if (typeof spec !== "string") {
        if (spec.bold) {
          node.toggleFormat("bold");
        }
        if (spec.mode !== undefined) {
          node.setMode(spec.mode);
        }
        if (spec.style !== undefined) {
          node.setStyle(spec.style);
        }
      }

      paragraph.append(node);
      keys.push(node.getKey());
    }
  });

  return editor.read(() =>
    keys.map((key) => {
      const node = $getNodeByKey(key);
      if (node === null || !$isTextNode(node)) {
        throw new Error("Expected TextNode");
      }
      return node;
    })
  );
}
