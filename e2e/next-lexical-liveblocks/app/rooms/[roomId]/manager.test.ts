import { describe, expect, it, vi } from "vitest";
import {
  LiveblocksCollaborationManager,
  $convertLiveElementNodeToLexicalNode,
  createStorageNodeFromLexicalNode,
  find_liveblocksNode,
} from "./manager";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  createEditor as createLexicalEditor,
  ElementNode,
  ParagraphNode,
  TextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { $dfs } from "@lexical/utils";
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $isHeadingNode,
} from "@lexical/rich-text";
import {
  LiveChildNode,
  LiveElementNode,
  LiveRootNode,
  LiveStorageNode,
  LiveTextNode,
} from "../../../liveblocks.config";
import { LiveList, LiveObject, LiveText, type Room } from "@liveblocks/client";
import {
  kStorageUpdateSource,
  kInternal,
  type StorageUpdate,
} from "@liveblocks/core";
import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../../../../packages/liveblocks-core/src/__tests__/_MockWebSocketServer.setup";

describe("LiveblocksCollaborationManager", () => {
  it("binds root, paragraph, and text", () => {
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
              content: new LiveText("Hello world!"),
            }),
          ]),
        }),
      ]),
    });

    const { editor, manager } = createEditor(document);

    editor.read(() => {
      const root = $getRoot();
      const paragraph_lexical = $dfs().find(({ node }) =>
        $isParagraphNode(node)
      )!.node as ParagraphNode;
      const text_lexical = $dfs(paragraph_lexical).find(({ node }) =>
        $isTextNode(node)
      )!.node as TextNode;

      const paragraph_liveblocks = document.get("children").get(0)!;
      const text_liveblocks = paragraph_liveblocks.get("children").get(0)!;

      // Root
      expect(manager.binding.forward.get(document)).toBe(root);
      expect(manager.binding.reverse.get(root.getKey())).toBe(document);

      // Paragraph (1:1 element)
      expect(manager.binding.forward.get(paragraph_liveblocks)).toBe(
        paragraph_lexical
      );
      expect(manager.binding.reverse.get(paragraph_lexical.getKey())).toBe(
        paragraph_liveblocks
      );

      // Text (coalesced: LiveTextNode ↔ TextNode[])
      const text = manager.binding.forward.get(text_liveblocks);
      expect(text).toBeInstanceOf(Array);
      expect((text as TextNode[]).length).toBe(1);
      expect((text as TextNode[])[0]).toBe(text_lexical);
      expect(manager.binding.reverse.get(text_lexical.getKey())).toBe(
        text_liveblocks
      );
    });
  });

  it("materializes element props from storage on bootstrap", () => {
    const heading = new LiveObject({
      kind: "element",
      type: "heading",
      version: 1,
      props: { tag: "h2" },
      children: new LiveList<LiveTextNode>([
        new LiveObject({
          kind: "text",
          type: "text",
          version: 1,
          content: new LiveText("Title"),
        }),
      ]),
    }) as LiveElementNode;
    const document: LiveRootNode = new LiveObject({
      kind: "root",
      type: "root",
      version: 1,
      children: new LiveList<LiveElementNode>([heading]),
    });

    const { editor } = createEditor(document);

    editor.read(() => {
      const heading_lexical = $getRoot().getFirstChild();
      if (!$isHeadingNode(heading_lexical)) {
        throw new Error("Expected HeadingNode");
      }
      expect(heading_lexical.getTag()).toBe("h2");
    });
  });

  describe("$encodeSelection", () => {
    async function createConnectedDocument(text: string) {
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
                    content: new LiveText(text),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      return root.get("document") as LiveRootNode;
    }

    it("encodes a collapsed text caret", async () => {
      const document = await createConnectedDocument("Hello world");
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
        const encoded = manager.$encodeSelection();
        expect(encoded).toEqual({
          anchor: {
            nodeId: textNodeId,
            type: "text",
            offset: 3,
            version: text_liveblocks.get("content").version,
          },
          focus: {
            nodeId: textNodeId,
            type: "text",
            offset: 3,
            version: text_liveblocks.get("content").version,
          },
        });
      });
    });

    it("encodes a collapsed caret inside coalesced text", async () => {
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
        textNodes[1].select(1, 1);
      });

      editor.read(() => {
        const textNodeId = text_liveblocks[kInternal].getId();
        const encoded = manager.$encodeSelection();
        expect(encoded).toEqual({
          anchor: {
            nodeId: textNodeId,
            type: "text",
            offset: 7,
            version: text_liveblocks.get("content").version,
          },
          focus: {
            nodeId: textNodeId,
            type: "text",
            offset: 7,
            version: text_liveblocks.get("content").version,
          },
        });
      });
    });

    it("encodes a non-collapsed range across coalesced segments", async () => {
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

    it("returns null when the selected text node is unbound", () => {
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
                content: new LiveText("Hello"),
              }),
            ]),
          }),
        ]),
      });
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

    it("returns null when the selection endpoint is a linebreak", () => {
      const document: LiveRootNode = new LiveObject({
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
      });
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
        expect(manager.$encodeSelection()).toBeNull();
      });
    });

    it("returns null when selection is missing", () => {
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
                content: new LiveText("Hello"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        expect(manager.$encodeSelection()).toBeNull();
      });
    });
  });

  describe("$decodeSelection", () => {
    async function createConnectedDocument(text: string) {
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
                    content: new LiveText(text),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      return root.get("document") as LiveRootNode;
    }

    it("round-trips a collapsed text caret", async () => {
      const document = await createConnectedDocument("Hello world");
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.select(3, 3);
      });

      editor.read(() => {
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();

        const decoded = manager.$decodeSelection(encoded!);
        expect(decoded).toEqual({
          anchor: {
            key: (
              $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
            ).getKey(),
            offset: 3,
            type: "text",
          },
          focus: {
            key: (
              $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
            ).getKey(),
            offset: 3,
            type: "text",
          },
        });
      });
    });

    it("round-trips a caret inside coalesced text", async () => {
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
        const encoded = manager.$encodeSelection();
        expect(encoded).not.toBeNull();

        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const secondText = paragraph
          .getChildren()
          .filter($isTextNode)[1] as TextNode;

        const decoded = manager.$decodeSelection(encoded!);
        expect(decoded).toEqual({
          anchor: {
            key: secondText.getKey(),
            offset: 1,
            type: "text",
          },
          focus: {
            key: secondText.getKey(),
            offset: 1,
            type: "text",
          },
        });
      });
    });

    it("round-trips a non-collapsed range across coalesced segments", async () => {
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
          anchor: {
            key: textNodes[0]!.getKey(),
            offset: 4,
            type: "text",
          },
          focus: {
            key: textNodes[1]!.getKey(),
            offset: 2,
            type: "text",
          },
        });
      });
    });

    it("round-trips an element point before a linebreak", async () => {
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
          anchor: {
            key: paragraph.getKey(),
            offset: 2,
            type: "element",
          },
          focus: {
            key: paragraph.getKey(),
            offset: 2,
            type: "element",
          },
        });
      });
    });

    it("returns null when the storage node id is unknown", async () => {
      const document = await createConnectedDocument("Hello");
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

    it("returns null when LiveText version is ahead of local state", async () => {
      const document = await createConnectedDocument("Hello");
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

    it("returns null when the point type does not match the storage node", async () => {
      const document = await createConnectedDocument("Hello");
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

    it("returns null when the storage text node is not bound", async () => {
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
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });
      const manager = new LiveblocksCollaborationManager(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      editor.update(() => {
        const children: ElementNode[] = [];
        for (const child of document.get("children")) {
          children.push($convertLiveElementNodeToLexicalNode(child));
        }
        $getRoot().append(...children);
      });

      editor.read(() => {
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
  });

  describe("$decodeSelection after remote updates", () => {
    it("repositions the local caret after a remote LiveText insert", async () => {
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
      const liveText = text_liveblocks.get("content");

      let presenceSelection: ReturnType<
        LiveblocksCollaborationManager["$encodeSelection"]
      > = null;

      editor.update(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        text_lexical.select(5, 5);
      });

      editor.read(() => {
        presenceSelection = manager.$encodeSelection();
        expect(presenceSelection).not.toBeNull();
      });

      const updates: StorageUpdate[] = [];
      const unregister = room.events.storageBatch.subscribe((batch) => {
        for (const update of batch) {
          if (update.type === "LiveText") {
            updates.push(update);
          }
        }
      });

      room.batch(() => {
        liveText.insert(0, "X");
      });
      unregister();

      editor.update(() => {
        manager.$applyRemoteUpdates(
          updates.map((update) => ({
            ...update,
            [kStorageUpdateSource]: { origin: "remote" },
          }))
        );

        expect(presenceSelection).not.toBeNull();
        const decoded = manager.$decodeSelection(presenceSelection!);
        expect(decoded).not.toBeNull();

        const selection = $getSelection();
        if (!$isRangeSelection(selection) || decoded === null) {
          throw new Error("Expected a range selection");
        }
        selection.anchor.set(
          decoded.anchor.key,
          decoded.anchor.offset,
          decoded.anchor.type
        );
        selection.focus.set(
          decoded.focus.key,
          decoded.focus.offset,
          decoded.focus.type
        );
      });

      editor.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          return;
        }

        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        expect(selection.anchor.key).toBe(text_lexical.getKey());
        expect(selection.anchor.offset).toBe(6);
        expect(selection.focus.key).toBe(text_lexical.getKey());
        expect(selection.focus.offset).toBe(6);
      });
    });
  });

  describe("$normalizeLexicalChildren", () => {
    it("coalesces sibling TextNodes bound to the same LiveText child", () => {
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
                content: new LiveText([["Hello ", { bold: true }], ["world"]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const slots = manager.$normalizeLexicalChildren(paragraph);

        expect(slots).toHaveLength(1);
        expect(slots[0]).toBeInstanceOf(Array);
        expect(
          (slots[0] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual(["Hello ", "world"]);
      });
    });

    it("keeps separate slots for LiveText children separated by a line break", () => {
      const document: LiveRootNode = new LiveObject({
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
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText(" world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const slots = manager.$normalizeLexicalChildren(paragraph);

        expect(slots).toHaveLength(3);
        expect(
          (slots[0] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual(["Hello"]);
        expect($isLineBreakNode(slots[1] as LexicalNode)).toBe(true);
        expect(
          (slots[2] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual([" world"]);

        const firstText = (slots[0] as TextNode[])[0];
        const secondText = (slots[2] as TextNode[])[0];
        expect(manager.binding.reverse.get(firstText.getKey())).not.toBe(
          manager.binding.reverse.get(secondText.getKey())
        );
      });
    });

    it("returns separate slots for text, line breaks, and text", () => {
      const document: LiveRootNode = new LiveObject({
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
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("there"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const slots = manager.$normalizeLexicalChildren(paragraph);

        expect(slots).toHaveLength(3);
        expect(
          (slots[0] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual(["Hi"]);
        expect($isLineBreakNode(slots[1] as LexicalNode)).toBe(true);
        expect(
          (slots[2] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual(["there"]);
      });
    });

    it("coalesces consecutive unbound TextNodes when reverse has no entries", () => {
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
                content: new LiveText(""),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        paragraph.clear();
        const first = $createTextNode("A");
        first.toggleUnmergeable();
        const second = $createTextNode("B");
        second.toggleUnmergeable();
        paragraph.append(first, second);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const slots = manager.$normalizeLexicalChildren(paragraph);

        expect(slots).toHaveLength(1);
        expect(
          (slots[0] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual(["A", "B"]);
        expect(
          manager.binding.reverse.get((slots[0] as TextNode[])[0].getKey())
        ).toBe(undefined);
      });
    });

    it("does not coalesce a bound TextNode with an unbound sibling", () => {
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
                content: new LiveText("Hello"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      )!;

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const second = $createTextNode(" world");
        second.toggleUnmergeable();
        paragraph.append(second);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const slots = manager.$normalizeLexicalChildren(paragraph);

        expect(slots).toHaveLength(2);
        expect(
          (slots[0] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual(["Hello"]);
        expect(
          (slots[1] as TextNode[]).map((node) => node.getTextContent())
        ).toEqual([" world"]);
        expect(
          manager.binding.reverse.get((slots[0] as TextNode[])[0].getKey())
        ).toBe(text_liveblocks);
        expect(
          manager.binding.reverse.get((slots[1] as TextNode[])[0].getKey())
        ).toBe(undefined);
      });
    });
  });

  describe("createStorageNodeFromLexicalNode", () => {
    it("materializes a TextNode[] into a LiveText child", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        const storage = createStorageNodeFromLexicalNode([
          $createTextNode("Hello"),
        ]);

        expect(storage.get("kind")).toBe("text");
        expect(storage.get("type")).toBe("text");
        expect((storage as LiveTextNode).get("content").toJSON()).toEqual([
          ["Hello"],
        ]);
      });
    });

    it("coalesces formatted sibling TextNodes into LiveText segments", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        const bold = $createTextNode("Hello ");
        bold.toggleFormat("bold");
        const plain = $createTextNode("world");

        const storage = createStorageNodeFromLexicalNode([bold, plain]);

        expect((storage as LiveTextNode).get("content").toJSON()).toEqual([
          ["Hello ", { bold: true }],
          ["world"],
        ]);
      });
    });

    it("materializes an empty TextNode[] into an empty LiveText child", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        const storage = createStorageNodeFromLexicalNode([]);

        expect(storage.get("kind")).toBe("text");
        expect((storage as LiveTextNode).get("content").toJSON()).toEqual([]);
      });
    });

    it("materializes a line break", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        const storage = createStorageNodeFromLexicalNode(
          $createLineBreakNode()
        );

        expect(storage.get("kind")).toBe("linebreak");
        expect(storage.get("type")).toBe("linebreak");
      });
    });

    it("materializes an element with nested text children", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        const paragraph = new ParagraphNode();
        paragraph.append($createTextNode("Hi"));

        const storage = createStorageNodeFromLexicalNode(paragraph);

        expect(storage.get("kind")).toBe("element");
        expect(storage.get("type")).toBe("paragraph");

        const children = (storage as LiveElementNode).get("children");
        expect(children.length).toBe(1);
        expect(children.get(0)!.get("kind")).toBe("text");
        expect(
          (children.get(0) as LiveTextNode).get("content").toJSON()
        ).toEqual([["Hi"]]);
      });
    });

    it("materializes an element with text, line break, and text children", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        const paragraph = new ParagraphNode();
        paragraph.append(
          $createTextNode("before"),
          $createLineBreakNode(),
          $createTextNode("after")
        );

        const storage = createStorageNodeFromLexicalNode(paragraph);
        const children = (storage as LiveElementNode).get("children");

        expect(children.length).toBe(3);
        expect(children.get(0)!.get("kind")).toBe("text");
        expect(
          (children.get(0) as LiveTextNode).get("content").toJSON()
        ).toEqual([["before"]]);
        expect(children.get(1)!.get("kind")).toBe("linebreak");
        expect(children.get(2)!.get("kind")).toBe("text");
        expect(
          (children.get(2) as LiveTextNode).get("content").toJSON()
        ).toEqual([["after"]]);
      });
    });

    it("throws for unsupported lexical node types", () => {
      const editor = createLexicalEditor({
        namespace: "test",
        nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
      });

      editor.update(() => {
        expect(() =>
          createStorageNodeFromLexicalNode($createTextNode("alone"))
        ).toThrow(/Unsupported lexical node type/);
      });
    });
  });

  describe("$applyLocalUpdates", () => {
    it("syncs a local text edit to storage", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      let dirtyElementKeys = new Set<string>();
      let dirtyLeafKeys = new Set<string>();
      let normalizedNodeKeys = new Set<string>();

      const unregister = editor.registerUpdateListener((update) => {
        dirtyElementKeys = new Set(update.dirtyElements.keys());
        dirtyLeafKeys = new Set(update.dirtyLeaves);
        normalizedNodeKeys = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("Hi world!");
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys,
          dirtyLeaves: dirtyLeafKeys,
          normalizedNodes: normalizedNodeKeys,
        });
      });

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      expect(text_liveblocks.get("content").toJSON()).toEqual([["Hi world!"]]);
    });

    it("syncs bold formatting to storage", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      let dirtyElementKeys = new Set<string>();
      let dirtyLeafKeys = new Set<string>();
      let normalizedNodeKeys = new Set<string>();

      const unregister = editor.registerUpdateListener((update) => {
        dirtyElementKeys = new Set(update.dirtyElements.keys());
        dirtyLeafKeys = new Set(update.dirtyLeaves);
        normalizedNodeKeys = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setFormat(1);
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys,
          dirtyLeaves: dirtyLeafKeys,
          normalizedNodes: normalizedNodeKeys,
        });
      });

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      expect(text_liveblocks.get("content").toJSON()).toEqual([
        ["Hello world!", { bold: true }],
      ]);
    });

    it("removes the LiveText child when Lexical text nodes are deleted", () => {
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
                content: new LiveText("Delete me"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      let dirtyElementKeys = new Set<string>();
      let dirtyLeafKeys = new Set<string>();
      let normalizedNodeKeys = new Set<string>();

      const unregister = editor.registerUpdateListener((update) => {
        dirtyElementKeys = new Set(update.dirtyElements.keys());
        dirtyLeafKeys = new Set(update.dirtyLeaves);
        normalizedNodeKeys = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          (
            $dfs().find(({ node }) => $isTextNode(node))?.node as TextNode
          ).setTextContent("");
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys,
          dirtyLeaves: dirtyLeafKeys,
          normalizedNodes: normalizedNodeKeys,
        });
      });

      const paragraph_liveblocks = document.get("children").get(0)!;

      expect(
        find_liveblocksNode(document, (node) => node.get("kind") === "text")
      ).toBeNull();
      expect(paragraph_liveblocks.get("children").length).toBe(0);
    });

    it("skips LiveText ops when bound text already matches and leaves are not dirty", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);
      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;
      const liveText = text_liveblocks.get("content");
      const insert = vi.spyOn(liveText, "insert");
      const del = vi.spyOn(liveText, "delete");
      const format = vi.spyOn(liveText, "format");

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;

        manager.$applyLocalUpdates({
          dirtyElements: new Set([paragraph.getKey()]),
          dirtyLeaves: new Set(),
          normalizedNodes: new Set(),
        });
      });

      expect(insert).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
      expect(format).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("rewires text binding after a local edit", () => {
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
                content: new LiveText("Hello"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      let dirtyElementKeys = new Set<string>();
      let dirtyLeafKeys = new Set<string>();
      let normalizedNodeKeys = new Set<string>();

      const unregister = editor.registerUpdateListener((update) => {
        dirtyElementKeys = new Set(update.dirtyElements.keys());
        dirtyLeafKeys = new Set(update.dirtyLeaves);
        normalizedNodeKeys = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("Hello world!");
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys,
          dirtyLeaves: dirtyLeafKeys,
          normalizedNodes: normalizedNodeKeys,
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const textNodes = $dfs()
          .map(({ node }) => node)
          .filter($isTextNode)
          .map((node) => node.getLatest());

        expect(manager.binding.forward.get(text_liveblocks)).toEqual(textNodes);
        for (const textNode of textNodes) {
          expect(manager.binding.reverse.get(textNode.getKey())).toBe(
            text_liveblocks
          );
        }
      });
    });

    it("syncs edits within a paragraph that contains a line break", () => {
      const document: LiveRootNode = new LiveObject({
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
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText(" world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      let dirtyElementKeys = new Set<string>();
      let dirtyLeafKeys = new Set<string>();
      let normalizedNodeKeys = new Set<string>();

      const unregister = editor.registerUpdateListener((update) => {
        dirtyElementKeys = new Set(update.dirtyElements.keys());
        dirtyLeafKeys = new Set(update.dirtyLeaves);
        normalizedNodeKeys = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          (
            $dfs(paragraph).find(({ node }) => $isTextNode(node))!
              .node as TextNode
          ).setTextContent("Hi");
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys,
          dirtyLeaves: dirtyLeafKeys,
          normalizedNodes: normalizedNodeKeys,
        });
      });

      const paragraph_liveblocks = document.get("children").get(0)!;
      const textChildren = paragraph_liveblocks
        .get("children")
        .filter((child) => child.get("kind") === "text") as LiveTextNode[];

      expect(textChildren[0]!.get("content").toJSON()).toEqual([["Hi"]]);
      expect(textChildren[1]!.get("content").toJSON()).toEqual([[" world"]]);
    });

    describe("deletions", () => {
      it("syncs deleting a root-level paragraph", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("B"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const list = document.get("children");

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            $getRoot().getLastChild()?.remove();
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.length).toBe(1);
        expect(
          (list.get(0)!.get("children").get(0)! as LiveTextNode)
            .get("content")
            .toJSON()
        ).toEqual([["A"]]);
      });

      it("syncs deleting the first root-level paragraph", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("Remove"),
                }),
              ]),
            }),
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("Keep"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const list = document.get("children");

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            $getRoot().getFirstChild()?.remove();
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.length).toBe(1);
        expect(
          (list.get(0)!.get("children").get(0)! as LiveTextNode)
            .get("content")
            .toJSON()
        ).toEqual([["Keep"]]);
      });

      it("syncs deleting a line break from a paragraph", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
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
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("there"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const paragraph = document.get("children").get(0)!;
        const children = paragraph.get("children");

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const paragraphNode = $getRoot().getFirstChild();
            if (!$isElementNode(paragraphNode)) {
              return;
            }
            paragraphNode.getChildAtIndex(1)?.remove();
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(children.length).toBe(1);
        expect(children.get(0)!.get("kind")).toBe("text");
        expect(
          (children.get(0)! as LiveTextNode).get("content").toJSON()
        ).toEqual([["Hithere"]]);
      });

      it("syncs deleting a nested paragraph inside a quote", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "quote",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "element",
                  type: "paragraph",
                  version: 1,
                  children: new LiveList([
                    new LiveObject({
                      kind: "text",
                      type: "text",
                      version: 1,
                      content: new LiveText("Remove"),
                    }),
                  ]),
                }),
                new LiveObject({
                  kind: "element",
                  type: "paragraph",
                  version: 1,
                  children: new LiveList([
                    new LiveObject({
                      kind: "text",
                      type: "text",
                      version: 1,
                      content: new LiveText("Keep"),
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const nestedList = document.get("children").get(0)!.get("children");

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const quote = $getRoot().getFirstChild();
            if (!$isElementNode(quote)) {
              return;
            }
            quote.getFirstChild()?.remove();
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(nestedList.length).toBe(1);
        expect(
          (
            (nestedList.get(0)! as LiveElementNode)
              .get("children")
              .get(0)! as LiveTextNode
          )
            .get("content")
            .toJSON()
        ).toEqual([["Keep"]]);
      });

      it("removes orphaned storage bindings when deleting a paragraph", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("B"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const deletedParagraph = document.get("children").get(1)!;
        const deletedText = deletedParagraph.get("children").get(0)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            $getRoot().getLastChild()?.remove();
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });

          expect(manager.binding.forward.get(deletedParagraph)).toBeUndefined();
          expect(manager.binding.forward.get(deletedText)).toBeUndefined();
        });
      });
    });

    describe("replacements", () => {
      it("rebinds the same storage paragraph when Lexical replaces it at the same index", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("Before"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const paragraph_liveblocks = list.get(0)!;
        const text_liveblocks = paragraph_liveblocks.get("children").get(0)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const oldParagraph = $getRoot().getFirstChild();
            if (oldParagraph == null) return;
            const nextParagraph = $createParagraphNode();
            nextParagraph.append($createTextNode("After"));
            oldParagraph.replace(nextParagraph);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.length).toBe(1);
        expect(list.get(0)).toBe(paragraph_liveblocks);
        expect(paragraph_liveblocks.get("children").get(0)).toBe(
          text_liveblocks
        );
        expect(
          (text_liveblocks as LiveTextNode).get("content").toJSON()
        ).toEqual([["After"]]);
      });

      it("rebinds the same LiveText when Lexical replaces the text node at the same slot", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("Before"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const paragraph_liveblocks = document.get("children").get(0)!;
        const text_liveblocks = paragraph_liveblocks.get("children").get(0)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const paragraph = $getRoot().getFirstChild();
            if (!$isElementNode(paragraph)) {
              return;
            }
            const oldText = paragraph.getFirstChild();
            if (oldText == null) return;
            const nextText = $createTextNode("After");
            nextText.toggleUnmergeable();
            oldText.replace(nextText);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });

          const paragraph = $getRoot().getFirstChild();
          if (!$isElementNode(paragraph)) {
            throw new Error("Expected element node");
          }
          const textNodes = paragraph
            .getChildren()
            .filter($isTextNode)
            .map((node: TextNode) => node.getLatest());

          expect(paragraph_liveblocks.get("children").length).toBe(1);
          expect(paragraph_liveblocks.get("children").get(0)).toBe(
            text_liveblocks
          );
          expect(
            (text_liveblocks as LiveTextNode).get("content").toJSON()
          ).toEqual([["After"]]);
          expect(manager.binding.forward.get(text_liveblocks)).toEqual(
            textNodes
          );
          expect(manager.binding.reverse.get(textNodes[0]!.getKey())).toBe(
            text_liveblocks
          );
        });
      });

      it("rebinds the same line break storage node when Lexical replaces it at the same slot", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
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
        });
        const { editor, manager } = createEditor(document);
        const paragraph_liveblocks = document.get("children").get(0)!;
        const lineBreak_liveblocks = paragraph_liveblocks
          .get("children")
          .get(1)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const paragraph = $getRoot().getFirstChild();
            if (!$isElementNode(paragraph)) {
              return;
            }
            const oldBreak = paragraph.getChildAtIndex(1);
            if (oldBreak == null) return;
            const nextBreak = $createLineBreakNode();
            oldBreak.replace(nextBreak);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });

          const paragraph = $getRoot().getFirstChild();
          if (!$isElementNode(paragraph)) {
            throw new Error("Expected element node");
          }
          const lineBreak = paragraph.getChildAtIndex(1);

          expect(paragraph_liveblocks.get("children").length).toBe(2);
          expect(paragraph_liveblocks.get("children").get(1)).toBe(
            lineBreak_liveblocks
          );
          expect($isLineBreakNode(lineBreak)).toBe(true);
          expect(manager.binding.forward.get(lineBreak_liveblocks)).toBe(
            lineBreak
          );
          expect(manager.binding.reverse.get(lineBreak!.getKey())).toBe(
            lineBreak_liveblocks
          );
        });
      });

      it("deletes storage instead of rebinding when the replacement occupant is a different kind", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("Before"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const paragraph_liveblocks = document.get("children").get(0)!;
        const text_liveblocks = paragraph_liveblocks.get("children").get(0)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const paragraph = $getRoot().getFirstChild();
            if (!$isElementNode(paragraph)) {
              return;
            }
            const oldText = paragraph.getFirstChild();
            if (oldText == null) return;
            const lineBreak = $createLineBreakNode();
            oldText.replace(lineBreak);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });

          expect(paragraph_liveblocks.get("children").length).toBe(1);
          expect(paragraph_liveblocks.get("children").get(0)!.get("kind")).toBe(
            "linebreak"
          );
          expect(manager.binding.forward.get(text_liveblocks)).toBeUndefined();
        });
      });
    });

    describe("reordering", () => {
      it("syncs moving a paragraph to the front of the root list", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
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
              children: new LiveList([
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
        const list = document.get("children");
        const moved = list.get(2)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const root = $getRoot();
            const third = root.getLastChild();
            const first = root.getFirstChild();
            if (third == null || first == null) {
              return;
            }
            third.remove();
            first.insertBefore(third);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.indexOf(moved as never)).toBe(0);
        expect(
          editor.read(() =>
            $dfs($getRoot())
              .map(({ node }) =>
                $isTextNode(node) ? node.getTextContent() : ""
              )
              .join("")
          )
        ).toBe("CAB");
      });

      it("syncs swapping two paragraphs in the root list", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
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
              children: new LiveList([
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
        const list = document.get("children");
        const paragraphB = list.get(1)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const root = $getRoot();
            const first = root.getFirstChild();
            const second = root.getChildAtIndex(1);
            if (first == null || second == null) {
              return;
            }
            second.remove();
            first.insertBefore(second);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.indexOf(paragraphB as never)).toBe(0);
        expect(
          editor.read(() =>
            $dfs($getRoot())
              .map(({ node }) =>
                $isTextNode(node) ? node.getTextContent() : ""
              )
              .join("")
          )
        ).toBe("BAC");
      });

      it("preserves storage object identity when reordering", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
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
              children: new LiveList([
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
        const list = document.get("children");
        const first = list.get(0)!;
        const second = list.get(1)!;
        const third = list.get(2)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const root = $getRoot();
            const last = root.getLastChild();
            const head = root.getFirstChild();
            if (last == null || head == null) {
              return;
            }
            last.remove();
            head.insertBefore(last);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.get(0)).toBe(third);
        expect(list.get(1)).toBe(first);
        expect(list.get(2)).toBe(second);
      });

      it("does not mutate LiveText when only reordering root paragraphs", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
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
              children: new LiveList([
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
        const liveTextSpies = document
          .get("children")
          .map((paragraph) =>
            vi.spyOn(
              (paragraph.get("children").get(0)! as LiveTextNode).get(
                "content"
              ),
              "insert"
            )
          );

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const root = $getRoot();
            const last = root.getLastChild();
            const head = root.getFirstChild();
            if (last == null || head == null) {
              return;
            }
            last.remove();
            head.insertBefore(last);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        for (const spy of liveTextSpies) {
          expect(spy).not.toHaveBeenCalled();
        }
        vi.restoreAllMocks();
      });

      it("syncs reordering nested paragraphs inside a quote", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "quote",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "element",
                  type: "paragraph",
                  version: 1,
                  children: new LiveList([
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
                  children: new LiveList([
                    new LiveObject({
                      kind: "text",
                      type: "text",
                      version: 1,
                      content: new LiveText("B"),
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const quote = document.get("children").get(0)!;
        const nestedList = quote.get("children");
        const paragraphB = nestedList.get(1)!;

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const quoteNode = $getRoot().getFirstChild() as QuoteNode;
            const first = quoteNode?.getFirstChild();
            const second = quoteNode?.getChildAtIndex(1);
            if (first == null || second == null) {
              return;
            }
            second.remove();
            first.insertBefore(second);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(nestedList.indexOf(paragraphB as never)).toBe(0);
        expect(
          editor.read(() =>
            $dfs($getRoot())
              .map(({ node }) =>
                $isTextNode(node) ? node.getTextContent() : ""
              )
              .join("")
          )
        ).toBe("BA");
      });

      it("preserves paragraph bindings after a root-level reorder", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
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
              children: new LiveList([
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
        const list = document.get("children");

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const root = $getRoot();
            const last = root.getLastChild();
            const head = root.getFirstChild();
            if (last == null || head == null) {
              return;
            }
            last.remove();
            head.insertBefore(last);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });

          const paragraphs = $getRoot().getChildren();
          expect(paragraphs).toHaveLength(3);

          for (let i = 0; i < paragraphs.length; i++) {
            const paragraph_lexical = paragraphs[i]!;
            const paragraph_liveblocks = list.get(i)!;

            expect(manager.binding.forward.get(paragraph_liveblocks)).toBe(
              paragraph_lexical
            );
            expect(
              manager.binding.reverse.get(paragraph_lexical.getKey())
            ).toBe(paragraph_liveblocks);
          }
        });
      });
    });

    describe("pruning", () => {
      it("prunes an unbound trailing paragraph from the root list", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("B"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const list = document.get("children");

        list.insert(
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Stale"),
              }),
            ]),
          }),
          2
        );
        expect(list.length).toBe(3);

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const paragraphs = $getRoot().getChildren() as ParagraphNode[];
            (paragraphs[0]!.getFirstChild() as TextNode).setTextContent("A!");
            (paragraphs[1]!.getFirstChild() as TextNode).setTextContent("B!");
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.length).toBe(2);
        expect(
          editor.read(() =>
            $dfs($getRoot())
              .map(({ node }) =>
                $isTextNode(node) ? node.getTextContent() : ""
              )
              .join("")
          )
        ).toBe("A!B!");
      });

      it("prunes an unbound trailing text child from a paragraph list", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
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
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const paragraphList = document.get("children").get(0)!.get("children");

        paragraphList.insert(
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText(" stale"),
          }),
          1
        );
        expect(paragraphList.length).toBe(2);

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            (
              $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
            ).setTextContent("Hello!");
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(paragraphList.length).toBe(1);
        expect(
          (paragraphList.get(0)! as LiveTextNode).get("content").toJSON()
        ).toEqual([["Hello!"]]);
      });

      it("prunes multiple trailing unbound storage children in one reconcile", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText("Only"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const paragraphList = document.get("children").get(0)!.get("children");

        paragraphList.insert(
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText(" stale 1"),
          }),
          1
        );
        paragraphList.insert(
          new LiveObject({
            kind: "text",
            type: "text",
            version: 1,
            content: new LiveText(" stale 2"),
          }),
          2
        );
        expect(paragraphList.length).toBe(3);

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            (
              $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
            ).setTextContent("Only!");
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(paragraphList.length).toBe(1);
        expect(
          (paragraphList.get(0)! as LiveTextNode).get("content").toJSON()
        ).toEqual([["Only!"]]);
      });
    });

    describe("element props", () => {
      it("syncs heading tag prop changes to storage", () => {
        const heading = new LiveObject({
          kind: "element",
          type: "heading",
          version: 1,
          props: { tag: "h1" },
          children: new LiveList<LiveTextNode>([
            new LiveObject({
              kind: "text",
              type: "text",
              version: 1,
              content: new LiveText("Title"),
            }),
          ]),
        }) as LiveElementNode;
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList<LiveElementNode>([heading]),
        });
        const { editor, manager } = createEditor(document);

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const oldHeading = $getRoot().getFirstChild();
            if (!$isHeadingNode(oldHeading)) {
              throw new Error("Expected HeadingNode");
            }
            const nextHeading = $createHeadingNode("h2");
            nextHeading.append(
              ...oldHeading.getChildren().map((child) => child.getLatest())
            );
            oldHeading.replace(nextHeading);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(heading.get("props")).toEqual({ tag: "h2" });
      });

      it("syncs props when dematerializing a new heading in the editor", () => {
        const document: LiveRootNode = new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([]),
        });
        const { editor, manager } = createEditor(document);
        const list = document.get("children");

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregister = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            const heading = $createHeadingNode("h1");
            heading.append($createTextNode("New title"));
            $getRoot().append(heading);
          },
          { discrete: true }
        );
        unregister();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(list.length).toBe(1);
        expect(list.get(0)!.get("type")).toBe("heading");
        expect(list.get(0)!.get("props")).toEqual({ tag: "h1" });
      });
    });

    it("syncs a transient insert followed by backspace without leaving stale bindings", () => {
      const document: LiveRootNode = new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Hello world !"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);
      const text_liveblocks = document
        .get("children")
        .get(0)!
        .get("children")
        .get(0)! as LiveTextNode;

      let dirtyElementKeys = new Set<string>();
      let dirtyLeafKeys = new Set<string>();
      let normalizedNodeKeys = new Set<string>();

      const unregister = editor.registerUpdateListener((update) => {
        dirtyElementKeys = new Set(update.dirtyElements.keys());
        dirtyLeafKeys = new Set(update.dirtyLeaves);
        normalizedNodeKeys = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild() as TextNode;
          if (textNode == null) {
            return;
          }
          textNode.insertBefore($createTextNode("H"));
        },
        { discrete: true }
      );
      unregister();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys,
          dirtyLeaves: dirtyLeafKeys,
          normalizedNodes: normalizedNodeKeys,
        });
      });

      let dirtyElementKeys2 = new Set<string>();
      let dirtyLeafKeys2 = new Set<string>();
      let normalizedNodeKeys2 = new Set<string>();

      const unregister2 = editor.registerUpdateListener((update) => {
        dirtyElementKeys2 = new Set(update.dirtyElements.keys());
        dirtyLeafKeys2 = new Set(update.dirtyLeaves);
        normalizedNodeKeys2 = new Set(update.normalizedNodes);
      });

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          for (const child of paragraph?.getChildren() ?? []) {
            if (child.getTextContent() === "H") {
              child.remove();
            }
          }
        },
        { discrete: true }
      );
      unregister2();

      editor.read(() => {
        manager.$applyLocalUpdates({
          dirtyElements: dirtyElementKeys2,
          dirtyLeaves: dirtyLeafKeys2,
          normalizedNodes: normalizedNodeKeys2,
        });

        for (const key of normalizedNodeKeys2) {
          expect(manager.binding.reverse.has(key)).toBe(false);
        }
      });

      expect(text_liveblocks.get("content").toJSON()).toEqual([
        ["Hello world !"],
      ]);
    });
  });

  describe("$applyRemoteUpdates", () => {
    describe("LiveText", () => {
      it("applies remote LiveText insert updates", async () => {
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
        const liveText = text_liveblocks.get("content");

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveText") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          liveText.insert(5, "!");
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("Hello! world");
        });
      });

      it("applies remote LiveText delete updates", async () => {
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
        const text = text_liveblocks.get("content");

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveText") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          text.delete(5, 6);
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("Hello");
        });
      });

      it("applies remote LiveText format updates that split segments", async () => {
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
        const text = text_liveblocks.get("content");

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveText") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          text.format(0, 5, { bold: true });
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          const textNodes = $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode) as TextNode[];

          expect(textNodes).toHaveLength(2);
          expect(textNodes[0].getTextContent()).toBe("Hello");
          expect(textNodes[0].getFormat() & 1).not.toBe(0);
          expect(textNodes[1].getTextContent()).toBe(" world");
        });
      });

      it("applies multiple remote LiveText changes in one update", async () => {
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
        const text = text_liveblocks.get("content");

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveText") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          text.delete(5, 6);
          text.insert(5, "!");
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("Hello!");
        });
      });

      it("skips idempotent remote LiveText updates", async () => {
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
                      content: new LiveText("Stable"),
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
        const text = text_liveblocks.get("content");

        const storageUpdates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((updates) => {
          for (const update of updates) {
            if (update.type === "LiveText") {
              storageUpdates.push(update);
            }
          }
        });

        room.batch(() => {
          text.insert(6, "!");
        });
        unregister();

        const remoteUpdates = storageUpdates.map((update) => ({
          ...update,
          [kStorageUpdateSource]: { origin: "remote" as const },
        }));

        editor.update(
          () => {
            manager.$applyRemoteUpdates(remoteUpdates);
          },
          { discrete: true }
        );

        editor.update(
          () => {
            manager.$applyRemoteUpdates(remoteUpdates);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("Stable!");
        });
      });

      it("does not duplicate when lexical already matches storage before remote insert", async () => {
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
                      content: new LiveText("hello"),
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

        let dirtyElementKeys = new Set<string>();
        let dirtyLeafKeys = new Set<string>();
        let normalizedNodeKeys = new Set<string>();

        const unregisterDirty = editor.registerUpdateListener((update) => {
          dirtyElementKeys = new Set(update.dirtyElements.keys());
          dirtyLeafKeys = new Set(update.dirtyLeaves);
          normalizedNodeKeys = new Set(update.normalizedNodes);
        });

        editor.update(
          () => {
            (
              $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
            ).setTextContent("hello!");
          },
          { discrete: true }
        );
        unregisterDirty();

        editor.read(() => {
          manager.$applyLocalUpdates({
            dirtyElements: dirtyElementKeys,
            dirtyLeaves: dirtyLeafKeys,
            normalizedNodes: normalizedNodeKeys,
          });
        });

        expect(liveText.toJSON()).toEqual([["hello!"]]);

        const remoteUpdates: StorageUpdate[] = [
          {
            type: "LiveText",
            node: liveText,
            version: liveText.version,
            updates: [{ type: "insert", index: 5, text: "!" }],
            [kStorageUpdateSource]: { origin: "remote" },
          },
        ];

        editor.update(
          () => {
            manager.$applyRemoteUpdates(remoteUpdates);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("hello!");
        });
      });

      it("does not duplicate when lexical is ahead of storage on remote insert", async () => {
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
                      content: new LiveText("hello"),
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

        editor.update(
          () => {
            (
              $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
            ).setTextContent("hello!");
          },
          { discrete: true }
        );

        const remoteUpdates: StorageUpdate[] = [
          {
            type: "LiveText",
            node: liveText,
            version: liveText.version,
            updates: [{ type: "insert", index: 5, text: "!" }],
            [kStorageUpdateSource]: { origin: "remote" },
          },
        ];

        editor.update(
          () => {
            manager.$applyRemoteUpdates(remoteUpdates);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("hello!");
        });
      });

      it("ignores local-origin LiveText updates", async () => {
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
        const text = text_liveblocks.get("content");

        const storageUpdates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((updates) => {
          for (const update of updates) {
            if (update.type === "LiveText") {
              storageUpdates.push(update);
            }
          }
        });

        room.batch(() => {
          text.insert(5, "!");
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(storageUpdates);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          expect(text_lexical.getTextContent()).toBe("Hello world");
        });
      });
    });

    describe("LiveList", () => {
      it("applies remote LiveList insert updates", async () => {
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
                      content: new LiveText("A"),
                    }),
                  ]),
                }),
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const paragraph = new LiveObject({
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
        }) as LiveElementNode;

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveList") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          list.insert(paragraph, 1);
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("AB");
          expect($getRoot().getChildren()).toHaveLength(2);
        });
      });

      it("applies remote LiveList delete updates", async () => {
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
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveList") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          list.delete(1);
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("A");
          expect($getRoot().getChildren()).toHaveLength(1);
        });
      });

      it("applies remote LiveList move updates", async () => {
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
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveList") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          list.move(0, 2);
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("BCA");
        });
      });

      it("applies remote LiveList set updates", async () => {
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
                      content: new LiveText("Before"),
                    }),
                  ]),
                }),
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const replacement = new LiveObject({
          kind: "element",
          type: "paragraph",
          version: 1,
          children: new LiveList<LiveTextNode>([
            new LiveObject({
              kind: "text",
              type: "text",
              version: 1,
              content: new LiveText("After"),
            }),
          ]),
        }) as LiveElementNode;

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveList") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          list.set(0, replacement);
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("After");
          expect($getRoot().getChildren()).toHaveLength(1);
        });
      });

      it("skips idempotent remote LiveList insert updates", async () => {
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
                      content: new LiveText("A"),
                    }),
                  ]),
                }),
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const paragraph = new LiveObject({
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
        }) as LiveElementNode;

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveList") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          list.insert(paragraph, 1);
        });
        unregister();

        const remoteUpdates = updates.map((update) => ({
          ...update,
          [kStorageUpdateSource]: { origin: "remote" as const },
        }));

        editor.update(
          () => {
            manager.$applyRemoteUpdates(remoteUpdates);
          },
          { discrete: true }
        );

        editor.update(
          () => {
            manager.$applyRemoteUpdates(remoteUpdates);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("AB");
          expect($getRoot().getChildren()).toHaveLength(2);
        });
      });

      it("skips nested LiveText updates covered by a list insert in the same batch", async () => {
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
                      content: new LiveText("A"),
                    }),
                  ]),
                }),
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const paragraph = new LiveObject({
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
        }) as LiveElementNode;

        list.insert(paragraph, 1);
        const nestedLiveText = (
          paragraph.get("children").get(0)! as LiveTextNode
        ).get("content");
        nestedLiveText.insert(1, "X");

        editor.update(
          () => {
            manager.$applyRemoteUpdates([
              {
                type: "LiveList",
                node: list,
                updates: [{ type: "insert", index: 1, item: paragraph }],
                [kStorageUpdateSource]: { origin: "remote" },
              },
              {
                type: "LiveText",
                node: nestedLiveText,
                version: nestedLiveText.version,
                updates: [{ type: "insert", index: 1, text: "X" }],
                [kStorageUpdateSource]: { origin: "remote" },
              },
            ]);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("ABX");
          expect($getRoot().getChildren()).toHaveLength(2);
        });
      });

      it("skips nested LiveText updates covered by a list insert regardless of batch order", async () => {
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
                      content: new LiveText("A"),
                    }),
                  ]),
                }),
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const paragraph = new LiveObject({
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
        }) as LiveElementNode;

        list.insert(paragraph, 1);
        const nestedLiveText = (
          paragraph.get("children").get(0)! as LiveTextNode
        ).get("content");
        nestedLiveText.insert(1, "X");

        editor.update(
          () => {
            manager.$applyRemoteUpdates([
              {
                type: "LiveText",
                node: nestedLiveText,
                version: nestedLiveText.version,
                updates: [{ type: "insert", index: 1, text: "X" }],
                [kStorageUpdateSource]: { origin: "remote" },
              },
              {
                type: "LiveList",
                node: list,
                updates: [{ type: "insert", index: 1, item: paragraph }],
                [kStorageUpdateSource]: { origin: "remote" },
              },
            ]);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("ABX");
        });
      });

      it("still applies nested LiveText updates in the same batch as a list move", async () => {
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
                      content: new LiveText("AB"),
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
                      content: new LiveText("CD"),
                    }),
                  ]),
                }),
              ]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);
        const list = document.get("children");
        const paragraph = list.get(0)!;
        const nestedLiveText = (
          paragraph.get("children").get(0)! as LiveTextNode
        ).get("content");

        list.move(0, 1);
        nestedLiveText.insert(2, "!");

        editor.update(
          () => {
            manager.$applyRemoteUpdates([
              {
                type: "LiveList",
                node: list,
                updates: [
                  {
                    type: "move",
                    previousIndex: 0,
                    index: 1,
                    item: paragraph,
                  },
                ],
                [kStorageUpdateSource]: { origin: "remote" },
              },
              {
                type: "LiveText",
                node: nestedLiveText,
                version: nestedLiveText.version,
                updates: [{ type: "insert", index: 2, text: "!" }],
                [kStorageUpdateSource]: { origin: "remote" },
              },
            ]);
          },
          { discrete: true }
        );

        editor.read(() => {
          const text = $dfs()
            .filter(({ node }) => $isTextNode(node))
            .map(({ node }) => (node as TextNode).getTextContent())
            .join("");
          expect(text).toBe("CDAB!");
        });
      });
    });

    describe("LiveObject", () => {
      it("applies remote LiveObject props updates on headings", async () => {
        const { room, root } = (await prepareIsolatedStorageTest(
          [createSerializedRoot()],
          0
        )) as unknown as {
          room: Room;
          root: LiveObject<{ document?: LiveRootNode }>;
        };

        const heading = new LiveObject({
          kind: "element",
          type: "heading",
          version: 1,
          props: { tag: "h1" },
          children: new LiveList<LiveTextNode>([
            new LiveObject({
              kind: "text",
              type: "text",
              version: 1,
              content: new LiveText("Title"),
            }),
          ]),
        }) as LiveElementNode;

        room.batch(() => {
          root.set(
            "document",
            new LiveObject({
              kind: "root",
              type: "root",
              version: 1,
              children: new LiveList<LiveElementNode>([heading]),
            })
          );
        });

        const document = root.get("document") as LiveRootNode;
        const { editor, manager } = createEditor(document);

        const updates: StorageUpdate[] = [];
        const unregister = room.events.storageBatch.subscribe((batch) => {
          for (const update of batch) {
            if (update.type === "LiveObject") {
              updates.push(update);
            }
          }
        });

        room.batch(() => {
          heading.set("props", { tag: "h2" });
        });
        unregister();

        editor.update(
          () => {
            manager.$applyRemoteUpdates(
              updates.map((update) => ({
                ...update,
                [kStorageUpdateSource]: { origin: "remote" },
              }))
            );
          },
          { discrete: true }
        );

        editor.read(() => {
          const heading_lexical = $getRoot().getFirstChild();
          if (!$isHeadingNode(heading_lexical)) {
            throw new Error("Expected HeadingNode");
          }
          expect(heading_lexical.getTag()).toBe("h2");
        });
      });
    });

    it("ignores empty remote update batches", () => {
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
                content: new LiveText("Stable"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(
        () => {
          manager.$applyRemoteUpdates([]);
        },
        { discrete: true }
      );

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        expect(text_lexical.getTextContent()).toBe("Stable");
      });
    });
  });

  describe("updateLiveTextFromLexicalNodes", () => {
    it("is a no-op on LiveText when segments already match", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      const text_liveblocks = find_liveblocksNode(
        document,
        (node) => node.get("kind") === "text"
      ) as LiveTextNode;

      const contentBefore = text_liveblocks.get("content").toJSON();

      editor.read(() => {
        const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;

        manager.updateLiveTextFromLexicalNodes(text_liveblocks, [text_lexical]);

        expect(text_liveblocks.get("content").toJSON()).toEqual(contentBefore);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual([
          text_lexical,
        ]);
        expect(manager.binding.reverse.get(text_lexical.getKey())).toBe(
          text_liveblocks
        );
      });
    });

    it("clears LiveText when all Lexical text is deleted", () => {
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
                content: new LiveText("Delete me"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))?.node as TextNode
        ).setTextContent("");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([]);
      });
    });

    it("synchronizes bold formatting when plain text already matches", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
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

        manager.updateLiveTextFromLexicalNodes(text_liveblocks, [
          text_lexical.getLatest(),
        ]);

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { bold: true }],
        ]);
      });
    });

    it("updates the LiveText when segments do not match", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
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

        manager.updateLiveTextFromLexicalNodes(text_liveblocks, [
          text_lexical.getLatest(),
        ]);
        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hi world!"],
        ]);
      });
    });

    it("appends text to LiveText", () => {
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
                content: new LiveText("Hello"),
              }),
            ]),
          }),
        ]),
      });
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

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!"],
        ]);
      });
    });

    it("removes bold formatting when plain text already matches", () => {
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
                content: new LiveText([["Hello world!", { bold: true }]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(0);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!"],
        ]);
      });
    });

    it("syncs edits within coalesced segmented text", () => {
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
                content: new LiveText([["Hello", { bold: true }], [" world"]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        (
          $dfs(paragraph).find(({ node }) => $isTextNode(node))!
            .node as TextNode
        ).setTextContent("HelXX");
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["HelXX", { bold: true }],
          [" world"],
        ]);
      });
    });

    it("syncs multiple formatted Lexical spans into LiveText segments", () => {
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
                content: new LiveText("Hello world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const first = $dfs(paragraph).find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        first.setTextContent("Hello ");
        first.setFormat(1);
        const second = $createTextNode("world");
        second.toggleUnmergeable();
        paragraph.append(second);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello ", { bold: true }],
          ["world"],
        ]);
      });
    });

    it("prepends text to LiveText", () => {
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
                content: new LiveText("world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hello world");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world"],
        ]);
      });
    });

    it("deletes text from the end of LiveText", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hello");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([["Hello"]]);
      });
    });

    it("deletes text from the start of LiveText", () => {
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
                content: new LiveText("Hello world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("world");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([["world"]]);
      });
    });

    it("rewires binding for each coalesced TextNode after sync", () => {
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
                content: new LiveText("Hello world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const first = $dfs(paragraph).find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        first.setTextContent("Hello ");
        first.setFormat(1);
        const second = $createTextNode("world");
        second.toggleUnmergeable();
        paragraph.append(second);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = $dfs(paragraph)
          .map(({ node }) => node)
          .filter($isTextNode)
          .map((node) => node.getLatest());
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(text_liveblocks, textNodes);

        expect(manager.binding.forward.get(text_liveblocks)).toEqual(textNodes);
        for (const textNode of textNodes) {
          expect(manager.binding.reverse.get(textNode.getKey())).toBe(
            text_liveblocks
          );
        }
      });
    });

    it("rewires binding after clearing all Lexical text", () => {
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
                content: new LiveText("Delete me"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))?.node as TextNode
        ).setTextContent("");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const textNodes = $dfs()
          .map(({ node }) => node)
          .filter($isTextNode)
          .map((node) => node.getLatest());

        manager.updateLiveTextFromLexicalNodes(text_liveblocks, textNodes);

        expect(text_liveblocks.get("content").toJSON()).toEqual([]);
        expect(manager.binding.forward.get(text_liveblocks)).toEqual(textNodes);
      });
    });

    it("synchronizes italic formatting when plain text already matches", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(2);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { italic: true }],
        ]);
      });
    });

    it("synchronizes underline formatting when plain text already matches", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(8);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { underline: true }],
        ]);
      });
    });

    it("synchronizes bold and italic combined formatting", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(3);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { bold: true, italic: true }],
        ]);
      });
    });

    it("syncs text and formatting changes together", () => {
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
                content: new LiveText("Goodbye"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const textNode = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        textNode.setTextContent("Hi world!");
        textNode.setFormat(1);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hi world!", { bold: true }],
        ]);
      });
    });

    it("bolds the full target segment after a shared-prefix text edit", () => {
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
                content: new LiveText("Hello world"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const textNode = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
        textNode.setTextContent("Hi world!");
        textNode.setFormat(1);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hi world!", { bold: true }],
        ]);
      });
    });

    it("syncs formatting changes within a single coalesced segment", () => {
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
                content: new LiveText([["Hello", { bold: true }], [" world"]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = $dfs(paragraph)
          .map(({ node }) => node)
          .filter($isTextNode);
        textNodes[1]?.setFormat(2);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello", { bold: true }],
          [" world", { italic: true }],
        ]);
      });
    });

    it("coalesces multiple Lexical spans into one formatted LiveText segment", () => {
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
                content: new LiveText([["Hello ", { bold: true }], ["world"]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        paragraph.clear();
        const merged = $createTextNode("Hello world");
        merged.setFormat(1);
        paragraph.append(merged);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world", { bold: true }],
        ]);
      });
    });

    it("merges LiveText segments when Lexical coalesces spans with matching plain text", () => {
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
                content: new LiveText([["Hello ", { bold: true }], ["world"]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        paragraph.clear();
        paragraph.append($createTextNode("Hello world"));
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world"],
        ]);
      });
    });

    it("merges LiveText segments when Lexical coalesces plain spans", () => {
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
                content: new LiveText([["Hello "], ["world"]]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        paragraph.clear();
        paragraph.append($createTextNode("Hello world"));
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world"],
        ]);
      });
    });

    it("synchronizes strikethrough formatting when plain text already matches", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(4);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { strikethrough: true }],
        ]);
      });
    });

    it("synchronizes code formatting when plain text already matches", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(16);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { code: true }],
        ]);
      });
    });

    it("synchronizes highlight formatting when plain text already matches", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(128);
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs()
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello world!", { highlight: true }],
        ]);
      });
    });

    it("removes bold from one segment without affecting another", () => {
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
                content: new LiveText([
                  ["Hello", { bold: true }],
                  [" world", { bold: true }],
                ]),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const first = $createTextNode("Hello");
        first.setFormat(1);
        first.toggleUnmergeable();
        const second = $createTextNode(" world");
        second.toggleUnmergeable();
        paragraph.clear();
        paragraph.append(first, second);
      });

      editor.read(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(
          text_liveblocks,
          $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode)
            .map((node) => node.getLatest())
        );

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Hello", { bold: true }],
          [" world"],
        ]);
      });
    });

    it("syncs using stale TextNode references via getLatest", () => {
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
                content: new LiveText("Hello world!"),
              }),
            ]),
          }),
        ]),
      });
      const { editor, manager } = createEditor(document);

      let staleTextNode: TextNode | undefined;
      editor.read(() => {
        staleTextNode = $dfs().find(({ node }) => $isTextNode(node))!
          .node as TextNode;
      });

      editor.update(() => {
        staleTextNode?.setTextContent("Updated text");
      });

      editor.read(() => {
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;

        manager.updateLiveTextFromLexicalNodes(text_liveblocks, [
          staleTextNode!,
        ]);

        expect(text_liveblocks.get("content").toJSON()).toEqual([
          ["Updated text"],
        ]);
      });
    });

    it("normalizes an empty TextNode placeholder to empty LiveText segments", () => {
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
                content: new LiveText("Hello"),
              }),
            ]),
          }),
        ]),
      });
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
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        const textNodes = $dfs(paragraph)
          .map(({ node }) => node)
          .filter($isTextNode);

        if (textNodes.length === 0) {
          manager.updateLiveTextFromLexicalNodes(text_liveblocks, []);
        } else {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            textNodes.map((node) => node.getLatest())
          );
        }

        expect(text_liveblocks.get("content").toJSON()).toEqual([]);
      });
    });

    describe("incremental LiveText ops", () => {
      it("issues no LiveText ops when segments already match", () => {
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
                  content: new LiveText("Hello world!"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);
        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          const text_lexical = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;

          manager.updateLiveTextFromLexicalNodes(text_liveblocks, [
            text_lexical,
          ]);
        });

        expect(insert).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
        expect(format).not.toHaveBeenCalled();
        vi.restoreAllMocks();
      });

      it("appends with a single insert op", () => {
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
                  content: new LiveText("Hello"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("Hello world!");
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(del).not.toHaveBeenCalled();
        expect(format).not.toHaveBeenCalled();
        expect(insert).toHaveBeenCalledTimes(1);
        expect(insert).toHaveBeenCalledWith(5, " world!", undefined);
        vi.restoreAllMocks();
      });

      it("applies format-only changes with a single format op", () => {
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
                  content: new LiveText("Hello world!"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setFormat(1);
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith(0, 12, { bold: true });
        vi.restoreAllMocks();
      });

      it("replaces the middle with prefix/suffix delete and insert ops", () => {
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
                  content: new LiveText("Hello world!"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("Hi world!");
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(format).not.toHaveBeenCalled();
        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(1, 4);
        expect(insert).toHaveBeenCalledTimes(1);
        expect(insert).toHaveBeenCalledWith(1, "i", undefined);
        expect(del).not.toHaveBeenCalledWith(0, 12);
        vi.restoreAllMocks();
      });

      it("bolds the full target segment after a shared-prefix text edit", () => {
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
                  content: new LiveText("Hello world"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          const textNode = $dfs().find(({ node }) => $isTextNode(node))!
            .node as TextNode;
          textNode.setTextContent("Hi world!");
          textNode.setFormat(1);
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(1, 10);
        expect(insert).toHaveBeenCalledTimes(1);
        expect(insert).toHaveBeenCalledWith(1, "i world!", { bold: true });
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith(0, 9, { bold: true });
        expect(del).not.toHaveBeenCalledWith(0, 11);
        vi.restoreAllMocks();
      });

      it("prepends with a single insert op", () => {
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
                  content: new LiveText("world"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("Hello world");
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(del).not.toHaveBeenCalled();
        expect(format).not.toHaveBeenCalled();
        expect(insert).toHaveBeenCalledTimes(1);
        expect(insert).toHaveBeenCalledWith(0, "Hello ", undefined);
        vi.restoreAllMocks();
      });

      it("deletes from the end with a single delete op", () => {
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
                  content: new LiveText("Hello world!"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("Hello");
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(format).not.toHaveBeenCalled();
        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(5, 7);
        expect(del).not.toHaveBeenCalledWith(0, 12);
        vi.restoreAllMocks();
      });

      it("deletes from the start with a single delete op", () => {
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
                  content: new LiveText("Hello world"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
          ).setTextContent("world");
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(format).not.toHaveBeenCalled();
        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(0, 6);
        expect(del).not.toHaveBeenCalledWith(0, 11);
        vi.restoreAllMocks();
      });

      it("formats a non-zero segment with a single format op", () => {
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
                  content: new LiveText([
                    ["Hello", { bold: true }],
                    [" world"],
                  ]),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          const textNodes = $dfs(paragraph)
            .map(({ node }) => node)
            .filter($isTextNode);
          textNodes[1]?.setFormat(2);
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs(paragraph)
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith(5, 6, { italic: true });
        vi.restoreAllMocks();
      });

      it("clears all text with a single delete op", () => {
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
                  content: new LiveText("Delete me"),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          (
            $dfs().find(({ node }) => $isTextNode(node))?.node as TextNode
          ).setTextContent("");
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs()
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(format).not.toHaveBeenCalled();
        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(0, 9);
        vi.restoreAllMocks();
      });

      it("removes bold from one segment with a format op", () => {
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
                  content: new LiveText([
                    ["Hello", { bold: true }],
                    [" world", { bold: true }],
                  ]),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          const first = $createTextNode("Hello");
          first.setFormat(1);
          first.toggleUnmergeable();
          const second = $createTextNode(" world");
          second.toggleUnmergeable();
          paragraph.clear();
          paragraph.append(first, second);
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs(paragraph)
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith(5, 6, { bold: null });
        vi.restoreAllMocks();
      });

      it("coalesces formatted spans by clearing bold with a format op", () => {
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
                  content: new LiveText([
                    ["Hello ", { bold: true }],
                    ["world"],
                  ]),
                }),
              ]),
            }),
          ]),
        });
        const { editor, manager } = createEditor(document);

        editor.update(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          paragraph.clear();
          paragraph.append($createTextNode("Hello world"));
        });

        const text_liveblocks = find_liveblocksNode(
          document,
          (node) => node.get("kind") === "text"
        ) as LiveTextNode;
        const liveText = text_liveblocks.get("content");
        const insert = vi.spyOn(liveText, "insert");
        const del = vi.spyOn(liveText, "delete");
        const format = vi.spyOn(liveText, "format");

        editor.read(() => {
          const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
            .node as ParagraphNode;
          manager.updateLiveTextFromLexicalNodes(
            text_liveblocks,
            $dfs(paragraph)
              .map(({ node }) => node)
              .filter($isTextNode)
              .map((node) => node.getLatest())
          );
        });

        expect(insert).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith(0, 11, { bold: null });
        vi.restoreAllMocks();
      });
    });
  });
});

function createEditor(document: LiveRootNode): {
  editor: LexicalEditor;
  manager: LiveblocksCollaborationManager;
} {
  const editor = createLexicalEditor({
    namespace: "test",
    nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
  });
  const manager = new LiveblocksCollaborationManager(document);

  editor.update(() => {
    const children: ElementNode[] = [];
    for (const child of document.get("children")) {
      children.push($convertLiveElementNodeToLexicalNode(child));
    }
    $getRoot().append(...children);

    manager.$updateBinding();
  });

  return { editor, manager };
}
