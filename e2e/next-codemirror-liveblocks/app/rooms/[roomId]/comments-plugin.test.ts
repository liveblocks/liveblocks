import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { LiveObject, type Room } from "@liveblocks/client";
import { CrdtType, LiveText, OpCode } from "@liveblocks/core";
import { describe, expect, onTestFinished, test, vi } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../../../../packages/liveblocks-core/src/__tests__/_MockWebSocketServer.setup";
import {
  attachThreadToSelection,
  createLiveblocksCommentsPlugin,
  getCommentPluginState,
  getCommentRangesFromData,
  LIVEBLOCKS_COMMENT_ATTR,
  LIVEBLOCKS_COMMENT_ORPHAN_ATTR,
  removeDeletedCommentThreadFormatting,
  setVisibleCommentThreads,
} from "./comments-plugin";
import { createLiveblocksSyncPlugin } from "./page";

describe("createLiveblocksCommentsPlugin", () => {
  test("extracts and merges LiveText comment ranges", () => {
    expect(
      getCommentRangesFromData([
        ["He", { threadId: "th_1" }],
        ["llo", { threadId: "th_1" }],
        [" "],
        ["world", { threadId: "th_2", commentOrphan: true }],
      ])
    ).toEqual([
      { from: 0, to: 5, threadId: "th_1", orphan: false },
      { from: 6, to: 11, threadId: "th_2", orphan: true },
    ]);
  });

  test("attaches a thread id to the current selection", async () => {
    const initialDoc = "Hello, world";
    const { room, root } = (await prepareIsolatedStorageTest(
      [
        createSerializedRoot(),
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "document",
            data: [[initialDoc]],
            version: 0,
          },
        ],
      ],
      0
    )) as unknown as {
      room: Room;
      root: LiveObject<{ document: LiveText }>;
    };

    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        selection: EditorSelection.single(0, 5),
        extensions: createLiveblocksCommentsPlugin(room, root),
      }),
      parent,
    });

    onTestFinished(() => {
      view.destroy();
      parent.remove();
    });

    expect(attachThreadToSelection(view, root, "th_1")).toBe(true);

    expect(root.get("document").toJSON()).toEqual([
      ["Hello", { [LIVEBLOCKS_COMMENT_ATTR]: "th_1" }],
      [", world"],
    ]);
    await vi.waitFor(() => {
      expect(getCommentPluginState(view)?.ranges).toEqual([
        { from: 0, to: 5, threadId: "th_1", orphan: false },
      ]);
    });
  });

  test("remote format updates decorations without changing text", async () => {
    const initialDoc = "Hello, world";
    const { room, root, applyRemoteOperations } =
      (await prepareIsolatedStorageTest(
        [
          createSerializedRoot(),
          [
            "0:1",
            {
              type: CrdtType.TEXT,
              parentId: "root",
              parentKey: "document",
              data: [[initialDoc]],
              version: 0,
            },
          ],
        ],
        0
      )) as unknown as {
        room: Room;
        root: LiveObject<{ document: LiveText }>;
        applyRemoteOperations: (ops: Array<unknown>) => void;
      };

    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          createLiveblocksSyncPlugin(room, root),
          ...createLiveblocksCommentsPlugin(room, root),
        ],
      }),
      parent,
    });

    onTestFinished(() => {
      view.destroy();
      parent.remove();
    });

    applyRemoteOperations([
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [
          {
            type: "format",
            index: 0,
            length: 5,
            attributes: { [LIVEBLOCKS_COMMENT_ATTR]: "th_1" },
          },
        ],
      },
    ]);

    await vi.waitFor(() => {
      expect(getCommentPluginState(view)?.ranges).toEqual([
        { from: 0, to: 5, threadId: "th_1", orphan: false },
      ]);
    });

    expect(view.state.doc.toString()).toBe(initialDoc);
    expect(view.contentDOM.querySelector(".lb-cm-thread-mark")).not.toBeNull();
  });

  test("deleting all commented text removes the highlight", async () => {
    const initialDoc = "Hello, world";
    const { room, root } = (await prepareIsolatedStorageTest(
      [
        createSerializedRoot(),
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "document",
            data: [
              ["Hello", { [LIVEBLOCKS_COMMENT_ATTR]: "th_1" }],
              [", world"],
            ],
            version: 0,
          },
        ],
      ],
      0
    )) as unknown as {
      room: Room;
      root: LiveObject<{ document: LiveText }>;
    };

    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          createLiveblocksSyncPlugin(room, root),
          ...createLiveblocksCommentsPlugin(room, root),
        ],
      }),
      parent,
    });

    onTestFinished(() => {
      view.destroy();
      parent.remove();
    });

    view.dispatch({ changes: { from: 0, to: 5 } });

    await vi.waitFor(() => {
      expect(getCommentPluginState(view)?.ranges).toEqual([]);
    });
    expect(view.contentDOM.querySelector(".lb-cm-thread-mark")).toBeNull();
  });

  test("removes formatting for deleted threads only", async () => {
    const { root } = (await prepareIsolatedStorageTest(
      [
        createSerializedRoot(),
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "document",
            data: [
              ["Hello", { [LIVEBLOCKS_COMMENT_ATTR]: "th_existing" }],
              [" "],
              [
                "world",
                {
                  [LIVEBLOCKS_COMMENT_ATTR]: "th_deleted",
                  [LIVEBLOCKS_COMMENT_ORPHAN_ATTR]: true,
                  bold: true,
                },
              ],
            ],
            version: 0,
          },
        ],
      ],
      0
    )) as unknown as {
      root: LiveObject<{ document: LiveText }>;
    };

    expect(
      removeDeletedCommentThreadFormatting(root, new Set(["th_existing"]))
    ).toBe(true);

    expect(root.get("document").toJSON()).toEqual([
      ["Hello", { [LIVEBLOCKS_COMMENT_ATTR]: "th_existing" }],
      [" "],
      ["world", { bold: true }],
    ]);
    expect(
      removeDeletedCommentThreadFormatting(root, new Set(["th_existing"]))
    ).toBe(false);
  });

  test("renders missing or resolved threads as orphan decorations", async () => {
    const initialDoc = "Hello, world";
    const { room, root } = (await prepareIsolatedStorageTest(
      [
        createSerializedRoot(),
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "document",
            data: [
              ["Hello", { [LIVEBLOCKS_COMMENT_ATTR]: "th_1" }],
              [", world"],
            ],
            version: 0,
          },
        ],
      ],
      0
    )) as unknown as {
      room: Room;
      root: LiveObject<{ document: LiveText }>;
    };

    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: createLiveblocksCommentsPlugin(room, root),
      }),
      parent,
    });

    onTestFinished(() => {
      view.destroy();
      parent.remove();
    });

    await vi.waitFor(() => {
      expect(getCommentPluginState(view)?.ranges).toEqual([
        { from: 0, to: 5, threadId: "th_1", orphan: false },
      ]);
    });

    setVisibleCommentThreads(view, new Set());

    await vi.waitFor(() => {
      expect(
        view.contentDOM.querySelector(".lb-cm-thread-mark-orphan")
      ).not.toBeNull();
    });
  });
});
