import {
  ChangeSet,
  EditorSelection,
  EditorState,
  Transaction,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { LiveObject, Room } from "@liveblocks/client";
import {
  CrdtType,
  kInternal,
  kStorageUpdateSource,
  LiveText,
  OpCode,
} from "@liveblocks/core";
import { describe, expect, onTestFinished, test, vi } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
  prepareStorageTest,
} from "../../../liveblocks-core/src/__tests__/_MockWebSocketServer.setup";
import { createLiveblocksSyncPlugin, isAdjacent } from "../sync-plugin";

describe("createLiveblocksSyncPlugin", () => {
  describe("local → storage", () => {
    test("local edit updates LiveText storage", async () => {
      const initialDoc = "Hello, world";

      // Connect a real room to the mock WebSocket server with a LiveText node.
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
          extensions: [createLiveblocksSyncPlugin(room, root)],
        }),
        parent,
      });

      onTestFinished(() => {
        view.destroy();
        parent.remove();
      });

      // Simulate the user typing "!" at the end of the document.
      view.dispatch({
        changes: { from: initialDoc.length, insert: "!" },
      });

      const storageText = root.get("document").toString();
      const editorText = view.state.doc.toString();

      expect(storageText).toBe("Hello, world!");
      expect(editorText).toBe("Hello, world!");
      expect(editorText).toBe(storageText);
    });

    test("local storage mutations are not echoed back into the editor", async () => {
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
          extensions: [createLiveblocksSyncPlugin(room, root)],
        }),
        parent,
      });

      onTestFinished(() => {
        view.destroy();
        parent.remove();
      });

      // Mutate storage directly on this client. The plugin should ignore it —
      // the editor already owns local changes.
      root.get("document").insert(0, "X");

      expect(root.get("document").toString()).toBe("XHello, world");
      expect(view.state.doc.toString()).toBe("Hello, world");
    });

    test("multi-change local edit updates LiveText storage", async () => {
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
          extensions: [createLiveblocksSyncPlugin(room, root)],
        }),
        parent,
      });

      onTestFinished(() => {
        view.destroy();
        parent.remove();
      });

      // One transaction, two changes — exercises offset tracking in the plugin.
      view.dispatch({
        changes: [
          { from: 0, to: 5, insert: "Hi" },
          { from: 7, to: 12, insert: "everyone" },
        ],
      });

      const storageText = root.get("document").toString();
      const editorText = view.state.doc.toString();

      expect(storageText).toBe("Hi, everyone");
      expect(editorText).toBe("Hi, everyone");
      expect(editorText).toBe(storageText);
    });
  });

  describe("remote → editor", () => {
    test("remote insert updates the editor document", async () => {
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
          applyRemoteOperations: (
            ops: Array<{
              type: typeof OpCode.UPDATE_TEXT;
              id: string;
              baseVersion: number;
              version: number;
              ops: Array<{ type: "insert"; index: number; text: string }>;
            }>
          ) => void;
        };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(room, root)],
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
          ops: [{ type: "insert", index: initialDoc.length, text: "!" }],
        },
      ]);

      const storageText = root.get("document").toString();
      const editorText = view.state.doc.toString();

      expect(storageText).toBe("Hello, world!");
      expect(editorText).toBe("Hello, world!");
      expect(editorText).toBe(storageText);
    });

    test("remote delete updates the editor document", async () => {
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
          applyRemoteOperations: (
            ops: Array<{
              type: typeof OpCode.UPDATE_TEXT;
              id: string;
              baseVersion: number;
              version: number;
              ops: Array<{ type: "delete"; index: number; length: number }>;
            }>
          ) => void;
        };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(room, root)],
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
          ops: [{ type: "delete", index: 0, length: 1 }],
        },
      ]);

      const storageText = root.get("document").toString();
      const editorText = view.state.doc.toString();

      expect(storageText).toBe("ello, world");
      expect(editorText).toBe("ello, world");
      expect(editorText).toBe(storageText);
    });

    test("remote multi-op update updates the editor document", async () => {
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
          applyRemoteOperations: (
            ops: Array<{
              type: typeof OpCode.UPDATE_TEXT;
              id: string;
              baseVersion: number;
              version: number;
              ops: Array<
                | { type: "insert"; index: number; text: string }
                | { type: "delete"; index: number; length: number }
              >;
            }>
          ) => void;
        };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(room, root)],
        }),
        parent,
      });

      onTestFinished(() => {
        view.destroy();
        parent.remove();
      });

      // One remote update with delete + insert (replace "Hello" with "Hi").
      applyRemoteOperations([
        {
          type: OpCode.UPDATE_TEXT,
          id: "0:1",
          baseVersion: 0,
          version: 1,
          ops: [
            { type: "delete", index: 0, length: 5 },
            { type: "insert", index: 0, text: "Hi" },
          ],
        },
      ]);

      const storageText = root.get("document").toString();
      const editorText = view.state.doc.toString();

      expect(storageText).toBe("Hi, world");
      expect(editorText).toBe("Hi, world");
      expect(editorText).toBe(storageText);
    });

    test("remote editor updates do not write back to storage", async () => {
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
          applyRemoteOperations: (
            ops: Array<{
              type: typeof OpCode.UPDATE_TEXT;
              id: string;
              baseVersion: number;
              version: number;
              ops: Array<{ type: "insert"; index: number; text: string }>;
            }>
          ) => void;
        };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const text = root.get("document");
      const replaceSpy = vi.spyOn(text, "replace");

      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(room, root)],
        }),
        parent,
      });

      onTestFinished(() => {
        replaceSpy.mockRestore();
        view.destroy();
        parent.remove();
      });

      applyRemoteOperations([
        {
          type: OpCode.UPDATE_TEXT,
          id: "0:1",
          baseVersion: 0,
          version: 1,
          ops: [{ type: "insert", index: initialDoc.length, text: "!" }],
        },
      ]);

      // Remote ops update storage without going through LiveText.replace.
      // The plugin must not write the editor change back through replace either.
      expect(replaceSpy.mock.calls.length).toBe(0);
      expect(text.toString()).toBe("Hello, world!");
      expect(view.state.doc.toString()).toBe("Hello, world!");
    });
  });

  describe("multi-client", () => {
    test("edits on client A appear in client B's editor", async () => {
      const initialDoc = "Hello, world";

      const { room, refRoom, storage, refStorage } = (await prepareStorageTest(
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
        refRoom: Room;
        storage: { root: LiveObject<{ document: LiveText }> };
        refStorage: { root: LiveObject<{ document: LiveText }> };
      };

      const parentA = document.createElement("div");
      const parentB = document.createElement("div");
      document.body.appendChild(parentA);
      document.body.appendChild(parentB);

      const viewA = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(room, storage.root)],
        }),
        parent: parentA,
      });

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(refRoom, refStorage.root)],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewA.destroy();
        viewB.destroy();
        parentA.remove();
        parentB.remove();
      });

      viewA.dispatch({
        changes: { from: initialDoc.length, insert: "!" },
      });

      const storageText = storage.root.get("document").toString();
      const refStorageText = refStorage.root.get("document").toString();
      const editorTextA = viewA.state.doc.toString();
      const editorTextB = viewB.state.doc.toString();

      expect(storageText).toBe("Hello, world!");
      expect(refStorageText).toBe("Hello, world!");
      expect(editorTextA).toBe("Hello, world!");
      expect(editorTextB).toBe("Hello, world!");
      expect(editorTextA).toBe(editorTextB);
    });

    test("concurrent edits on both clients converge", async () => {
      const initialDoc = "Hello, world";

      const { room, refRoom, storage, refStorage, applyRemoteOperations } =
        (await prepareStorageTest(
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
          refRoom: Room;
          storage: { root: LiveObject<{ document: LiveText }> };
          refStorage: { root: LiveObject<{ document: LiveText }> };
          applyRemoteOperations: (
            ops: Array<{
              type: typeof OpCode.UPDATE_TEXT;
              id: string;
              baseVersion: number;
              version: number;
              ops: Array<{ type: "insert"; index: number; text: string }>;
            }>
          ) => void;
        };

      const parentA = document.createElement("div");
      const parentB = document.createElement("div");
      document.body.appendChild(parentA);
      document.body.appendChild(parentB);

      const viewA = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(room, storage.root)],
        }),
        parent: parentA,
      });

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [createLiveblocksSyncPlugin(refRoom, refStorage.root)],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewA.destroy();
        viewB.destroy();
        parentA.remove();
        parentB.remove();
      });

      // Client A inserts at the end. prepareStorageTest relays subject ops to refRoom.
      viewA.dispatch({
        changes: { from: initialDoc.length, insert: "!" },
      });

      // Client B inserts at the start on its own connection.
      viewB.dispatch({
        changes: { from: 0, insert: "X" },
      });

      // Mock server only relays subject → ref, not ref → subject. Apply B's op on A.
      const baseVersion = storage.root.get("document").version;
      applyRemoteOperations([
        {
          type: OpCode.UPDATE_TEXT,
          id: "0:1",
          baseVersion,
          version: baseVersion + 1,
          ops: [{ type: "insert", index: 0, text: "X" }],
        },
      ]);

      const storageTextA = storage.root.get("document").toString();
      const storageTextB = refStorage.root.get("document").toString();
      const editorTextA = viewA.state.doc.toString();
      const editorTextB = viewB.state.doc.toString();

      expect(storageTextA).toBe("XHello, world!");
      expect(storageTextB).toBe("XHello, world!");
      expect(editorTextA).toBe("XHello, world!");
      expect(editorTextB).toBe("XHello, world!");
      expect(editorTextA).toBe(editorTextB);
    });
  });

  describe("undo / redo", () => {
    describe("document", () => {
      test("undo reverts the editor and storage", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({
          changes: { from: initialDoc.length, insert: "!" },
        });

        expect(root.get("document").toString()).toBe("Hello, world!");
        expect(view.state.doc.toString()).toBe("Hello, world!");

        room.history.resume();
        room.history.undo();

        const storageText = root.get("document").toString();
        const editorText = view.state.doc.toString();

        expect(storageText).toBe(initialDoc);
        expect(editorText).toBe(initialDoc);
        expect(editorText).toBe(storageText);
      });

      test("redo restores the editor and storage", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({
          changes: { from: initialDoc.length, insert: "!" },
        });

        expect(root.get("document").toString()).toBe("Hello, world!");
        expect(view.state.doc.toString()).toBe("Hello, world!");

        room.history.resume();
        room.history.undo();

        expect(root.get("document").toString()).toBe(initialDoc);
        expect(view.state.doc.toString()).toBe(initialDoc);

        room.history.resume();
        room.history.redo();

        const storageText = root.get("document").toString();
        const editorText = view.state.doc.toString();

        expect(storageText).toBe("Hello, world!");
        expect(editorText).toBe("Hello, world!");
        expect(editorText).toBe(storageText);
      });
    });

    describe("grouping", () => {
      test("consecutive typing is undone in one step", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        for (const char of "!!") {
          view.dispatch({
            changes: {
              from: view.state.doc.length,
              insert: char,
            },
            selection: EditorSelection.single(view.state.doc.length + 1),
            annotations: [
              Transaction.userEvent.of("input.type"),
              Transaction.time.of(Date.now()),
            ],
          });
        }

        expect(view.state.doc.toString()).toBe("Hello, world!!");

        room.history.resume();
        room.history.undo();

        expect(view.state.doc.toString()).toBe(initialDoc);
        expect(root.get("document").toString()).toBe(initialDoc);
      });

      test("non-adjacent edits undo separately", async () => {
        const initialDoc = "012345678901234567890";

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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        const time = Date.now();
        view.dispatch({
          changes: { from: 0, insert: "A" },
          selection: EditorSelection.single(1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(time),
          ],
        });
        view.dispatch({
          changes: { from: view.state.doc.length, insert: "B" },
          selection: EditorSelection.single(view.state.doc.length + 1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(time + 1),
          ],
        });

        expect(view.state.doc.toString()).toBe("A012345678901234567890B");

        room.history.resume();
        room.history.undo();
        expect(view.state.doc.toString()).toBe("A012345678901234567890");

        room.history.undo();
        expect(view.state.doc.toString()).toBe(initialDoc);
      });

      test("selection change starts a new undo group", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        const time = Date.now();
        view.dispatch({
          changes: { from: initialDoc.length, insert: "!" },
          selection: EditorSelection.single(initialDoc.length + 1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(time),
          ],
        });
        view.dispatch({
          selection: EditorSelection.single(0),
          annotations: [
            Transaction.userEvent.of("select.pointer"),
            Transaction.time.of(time + 1),
          ],
        });
        view.dispatch({
          changes: { from: 0, insert: "X" },
          selection: EditorSelection.single(1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(time + 2),
          ],
        });

        expect(view.state.doc.toString()).toBe("XHello, world!");

        room.history.resume();
        room.history.undo();
        expect(view.state.doc.toString()).toBe("Hello, world!");

        room.history.undo();
        expect(view.state.doc.toString()).toBe(initialDoc);
      });

      test("paste starts a new undo group", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        const cursor = initialDoc.length;
        const time = Date.now();
        view.dispatch({
          changes: { from: cursor, insert: "!" },
          selection: EditorSelection.single(cursor + 1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(time),
          ],
        });
        view.dispatch({
          changes: { from: cursor + 1, insert: "?" },
          selection: EditorSelection.single(cursor + 2),
          annotations: [
            Transaction.userEvent.of("input.paste"),
            Transaction.time.of(time + 1),
          ],
        });

        expect(view.state.doc.toString()).toBe("Hello, world!?");

        room.history.resume();
        room.history.undo();
        expect(view.state.doc.toString()).toBe("Hello, world!");

        room.history.undo();
        expect(view.state.doc.toString()).toBe(initialDoc);
      });

      test("a 500ms gap between edits starts a new undo group", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        vi.useFakeTimers();
        onTestFinished(() => {
          vi.useRealTimers();
          view.destroy();
          parent.remove();
        });

        const cursor = initialDoc.length;
        view.dispatch({
          changes: { from: cursor, insert: "!" },
          selection: EditorSelection.single(cursor + 1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(0),
          ],
        });
        view.dispatch({
          changes: {
            from: view.state.doc.length,
            insert: "?",
          },
          selection: EditorSelection.single(view.state.doc.length + 1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(600),
          ],
        });

        expect(view.state.doc.toString()).toBe("Hello, world!?");

        room.history.resume();
        room.history.undo();
        expect(view.state.doc.toString()).toBe("Hello, world!");

        room.history.undo();
        expect(view.state.doc.toString()).toBe(initialDoc);
      });

      test("IME compose merges into the previous group", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        const cursor = initialDoc.length;
        view.dispatch({
          changes: { from: cursor, insert: "!" },
          selection: EditorSelection.single(cursor + 1),
          annotations: [
            Transaction.userEvent.of("input.type"),
            Transaction.time.of(0),
          ],
        });
        view.dispatch({
          changes: { from: cursor + 1, insert: "?" },
          selection: EditorSelection.single(cursor + 2),
          annotations: [
            Transaction.userEvent.of("input.type.compose"),
            Transaction.time.of(600),
          ],
        });

        expect(view.state.doc.toString()).toBe("Hello, world!?");

        room.history.resume();
        room.history.undo();

        expect(view.state.doc.toString()).toBe(initialDoc);
        expect(root.get("document").toString()).toBe(initialDoc);
      });
    });

    describe("selection", () => {
      test("undo restores the selection from before the edit", async () => {
        const initialDoc = "Hello, world";
        const cursor = initialDoc.length;

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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({ selection: EditorSelection.single(cursor) });
        view.dispatch({
          changes: { from: cursor, insert: "!" },
          selection: EditorSelection.single(cursor + 1),
        });

        room.history.resume();
        room.history.undo();

        expect(view.state.doc.toString()).toBe(initialDoc);
        expect(view.state.selection.main.anchor).toBe(cursor);
        expect(view.state.selection.main.head).toBe(cursor);
      });

      test("redo restores the selection from after the edit", async () => {
        const initialDoc = "Hello, world";
        const cursor = initialDoc.length;

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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({ selection: EditorSelection.single(cursor) });
        view.dispatch({
          changes: { from: cursor, insert: "!" },
          selection: EditorSelection.single(cursor + 1),
        });

        const afterCursor = cursor + 1;

        room.history.resume();
        room.history.undo();
        room.history.resume();
        room.history.redo();

        expect(view.state.doc.toString()).toBe("Hello, world!");
        expect(view.state.selection.main.anchor).toBe(afterCursor);
        expect(view.state.selection.main.head).toBe(afterCursor);
      });

      test("undo clamps the selection when the document shrinks", async () => {
        const initialDoc = "Hello, world";
        const cursor = initialDoc.length;
        const deleteFrom = 5;

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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        // Cursor at end, then delete ", world". Undo restores the pre-delete
        // selection (past the shorter doc) and must clamp it.
        view.dispatch({ selection: EditorSelection.single(cursor) });
        view.dispatch({
          changes: { from: deleteFrom, to: cursor, insert: "" },
          selection: EditorSelection.single(deleteFrom),
        });

        expect(view.state.doc.toString()).toBe("Hello");
        expect(view.state.selection.main.head).toBe(deleteFrom);

        room.history.resume();
        room.history.undo();

        expect(view.state.doc.toString()).toBe(initialDoc);
        expect(view.state.selection.main.anchor).toBe(cursor);
        expect(view.state.selection.main.head).toBe(cursor);
        expect(view.state.selection.main.head).toBeLessThanOrEqual(
          view.state.doc.length
        );
      });

      test("peer remote edit rebases stored history selections before undo", async () => {
        const initialDoc = "Hello, world";
        const cursor = initialDoc.length;

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
            applyRemoteOperations: (
              ops: Array<{
                type: typeof OpCode.UPDATE_TEXT;
                id: string;
                baseVersion: number;
                version: number;
                ops: Array<{ type: "insert"; index: number; text: string }>;
              }>
            ) => void;
          };

        const parent = document.createElement("div");
        document.body.appendChild(parent);

        const view = new EditorView({
          state: EditorState.create({
            doc: initialDoc,
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({ selection: EditorSelection.single(cursor) });
        view.dispatch({
          changes: { from: cursor, insert: "!" },
          selection: EditorSelection.single(cursor + 1),
        });

        expect(view.state.doc.toString()).toBe("Hello, world!");

        const baseVersion = root.get("document").version;
        applyRemoteOperations([
          {
            type: OpCode.UPDATE_TEXT,
            id: "0:1",
            baseVersion,
            version: baseVersion + 1,
            ops: [{ type: "insert", index: 0, text: "X" }],
          },
        ]);

        expect(view.state.doc.toString()).toBe("XHello, world!");

        room.history.resume();
        room.history.undo();

        // Local "!" undone; peer "X" remains. Cursor was at 12 before the local
        // edit, rebased to 13 after the peer insert at 0.
        expect(view.state.doc.toString()).toBe("XHello, world");
        expect(view.state.selection.main.anchor).toBe(13);
        expect(view.state.selection.main.head).toBe(13);
      });

      test("replace edit restores selection on undo and redo", async () => {
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
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({ selection: EditorSelection.single(0, 5) });
        view.dispatch({
          changes: { from: 0, to: 5, insert: "Hi" },
          selection: EditorSelection.single(2),
        });

        expect(view.state.doc.toString()).toBe("Hi, world");
        expect(view.state.selection.main.anchor).toBe(2);
        expect(view.state.selection.main.head).toBe(2);

        room.history.resume();
        room.history.undo();

        expect(view.state.doc.toString()).toBe(initialDoc);
        expect(view.state.selection.main.anchor).toBe(0);
        expect(view.state.selection.main.head).toBe(5);

        room.history.resume();
        room.history.redo();

        expect(view.state.doc.toString()).toBe("Hi, world");
        expect(view.state.selection.main.anchor).toBe(2);
        expect(view.state.selection.main.head).toBe(2);
      });

      test("range undo cannot restore selection via decodeIndex or selection.map", async () => {
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

        const liveText = root.get("document");
        const parent = document.createElement("div");
        document.body.appendChild(parent);

        const view = new EditorView({
          state: EditorState.create({
            doc: initialDoc,
            extensions: [createLiveblocksSyncPlugin(room, root)],
          }),
          parent,
        });

        onTestFinished(() => {
          view.destroy();
          parent.remove();
        });

        view.dispatch({ selection: EditorSelection.single(0, 5) });
        view.dispatch({
          changes: { from: 0, to: 5, insert: "Hi" },
          selection: EditorSelection.single(2),
        });

        let undoChanges = ChangeSet.empty(0);

        const sub = room.subscribe(
          root,
          (updates) => {
            for (const update of updates) {
              if (update.type !== "LiveText" || update.node !== liveText) {
                continue;
              }
              const source = update[kStorageUpdateSource];
              if (
                source?.origin !== "local" ||
                source.via !== "history" ||
                source.action !== "undo"
              ) {
                continue;
              }

              let changes = ChangeSet.empty(view.state.doc.length);
              let currentLength = view.state.doc.length;
              for (const change of update.updates) {
                const step =
                  change.type === "insert"
                    ? ChangeSet.of(
                        [{ from: change.index, insert: change.text }],
                        currentLength
                      )
                    : ChangeSet.of(
                        [
                          {
                            from: change.index,
                            to: change.index + change.length,
                          },
                        ],
                        currentLength
                      );
                changes = changes.compose(step);
                currentLength = changes.newLength;
              }
              undoChanges = changes;
            }
          },
          { isDeep: true }
        );

        room.history.resume();
        room.history.undo();
        sub();

        const mappedCurrent = view.state.selection.map(undoChanges, 1);

        expect(view.state.doc.toString()).toBe(initialDoc);
        expect(view.state.selection.main.anchor).toBe(0);
        expect(view.state.selection.main.head).toBe(5);
        expect({
          decodeAnchor: liveText[kInternal].decodeIndex(0, 0),
          decodeHead: liveText[kInternal].decodeIndex(5, 0),
          mapCurrentSelection: {
            anchor: mappedCurrent.main.anchor,
            head: mappedCurrent.main.head,
          },
        }).toEqual({
          decodeAnchor: 5,
          decodeHead: 5,
          mapCurrentSelection: { anchor: 0, head: 8 },
        });
      });
    });
  });

  describe("isAdjacent", () => {
    test("returns true when change ranges overlap", () => {
      const prev = ChangeSet.of([{ from: 2, to: 4, insert: "x" }], 10);
      const next = ChangeSet.of([{ from: 3, insert: "y" }], 11);

      expect(isAdjacent(prev, next)).toBe(true);
    });

    test("returns false when change ranges are separate", () => {
      const prev = ChangeSet.of([{ from: 1, insert: "x" }], 10);
      const next = ChangeSet.of([{ from: 8, insert: "y" }], 11);

      expect(isAdjacent(prev, next)).toBe(false);
    });
  });
});
