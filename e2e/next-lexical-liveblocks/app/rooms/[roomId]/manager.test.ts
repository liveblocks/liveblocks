import { describe, expect, it, vi } from "vitest";
import {
  LiveblocksCollaborationManager,
  $convertLiveElementNodeToLexicalNode,
} from "./manager";
import {
  $createTextNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  createEditor as createLexicalEditor,
  ElementNode,
  ParagraphNode,
  TextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { $dfs } from "@lexical/utils";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  LiveChildNode,
  LiveElementNode,
  LiveRootNode,
  LiveStorageNode,
  LiveTextNode,
} from "../../../liveblocks.config";
import { LiveList, LiveObject, LiveText } from "@liveblocks/client";

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

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hi world!");
      }, { discrete: true });
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

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setFormat(1);
      }, { discrete: true });
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

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))?.node as TextNode
        ).setTextContent("");
      }, { discrete: true });
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

      editor.update(() => {
        (
          $dfs().find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hello world!");
      }, { discrete: true });
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

      editor.update(() => {
        const paragraph = $dfs().find(({ node }) => $isParagraphNode(node))!
          .node as ParagraphNode;
        (
          $dfs(paragraph).find(({ node }) => $isTextNode(node))!.node as TextNode
        ).setTextContent("Hi");
      }, { discrete: true });
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

function find_liveblocksNode(
  node: LiveStorageNode,
  predicate: (node: LiveStorageNode) => boolean
): LiveStorageNode | null {
  if (predicate(node)) {
    return node;
  }

  const kind = node.get("kind");
  if (kind === "root" || kind === "element") {
    for (const child of (
      node as LiveObject<{
        kind: "root" | "element";
        children: LiveList<LiveChildNode>;
      }>
    ).get("children")) {
      const found = find_liveblocksNode(child, predicate);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
}
