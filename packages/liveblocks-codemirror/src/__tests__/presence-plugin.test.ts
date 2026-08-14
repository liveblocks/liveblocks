import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { LiveObject, Room } from "@liveblocks/client";
import type { LiveText } from "@liveblocks/core";
import { CrdtType, kInternal } from "@liveblocks/core";
import { describe, expect, onTestFinished, test, vi } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
  prepareStorageTest,
} from "../../../liveblocks-core/src/__tests__/_MockWebSocketServer.setup";
import {
  createLiveblocksPresencePlugin,
  type LiveblocksCodemirrorSelection,
} from "../presence-plugin";
import { createLiveblocksSyncPlugin } from "../sync-plugin";

type Presence = {
  selection: LiveblocksCodemirrorSelection | null;
};

describe("createLiveblocksPresencePlugin", () => {
  describe("local → presence", () => {
    test("local edit broadcasts encoded selection", async () => {
      const initialDoc = "abc";

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
        room: Room<Presence>;
        root: LiveObject<{ document: LiveText }>;
      };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const updatePresence = vi.spyOn(room, "updatePresence");
      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(room, root.get("document")),
            ...createLiveblocksPresencePlugin(room, root.get("document")),
          ],
        }),
        parent,
      });

      onTestFinished(() => {
        view.destroy();
        parent.remove();
      });

      view.dispatch({
        selection: EditorSelection.cursor(2),
        changes: { from: 2, to: 2, insert: "!" },
      });

      const text = root.get("document");
      expect(updatePresence).toHaveBeenCalledWith({
        selection: {
          anchor: text[kInternal].encodeIndex(3),
          head: text[kInternal].encodeIndex(3),
          version: text.version,
        },
      });
    });

    test("remote transactions do not broadcast selection", async () => {
      const initialDoc = "abc";

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
        room: Room<Presence>;
        root: LiveObject<{ document: LiveText }>;
      };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const updatePresence = vi.spyOn(room, "updatePresence");
      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(room, root.get("document")),
            ...createLiveblocksPresencePlugin(room, root.get("document")),
          ],
        }),
        parent,
      });

      onTestFinished(() => {
        view.destroy();
        parent.remove();
      });

      updatePresence.mockClear();

      view.dispatch({
        changes: { from: 0, to: 0, insert: "Y" },
        annotations: [Transaction.remote.of(true)],
      });

      expect(updatePresence).not.toHaveBeenCalled();
    });

    test("destroy clears presence", async () => {
      const initialDoc = "abc";

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
        room: Room<Presence>;
        root: LiveObject<{ document: LiveText }>;
      };

      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const updatePresence = vi.spyOn(room, "updatePresence");
      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: createLiveblocksPresencePlugin(
            room,
            root.get("document")
          ),
        }),
        parent,
      });

      updatePresence.mockClear();
      view.destroy();
      parent.remove();

      expect(updatePresence).toHaveBeenCalledWith({ selection: null });
    });
  });

  describe("remote → layers", () => {
    test("displays existing remote cursors on mount", async () => {
      const initialDoc = "a\nb";

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
        room: Room<Presence>;
        refRoom: Room<Presence>;
        storage: { root: LiveObject<{ document: LiveText }> };
        refStorage: { root: LiveObject<{ document: LiveText }> };
      };

      const text = storage.root.get("document");
      room.updatePresence({
        selection: {
          anchor: text[kInternal].encodeIndex(1),
          head: text[kInternal].encodeIndex(1),
          version: text.version,
        },
      });

      await vi.waitFor(() => {
        expect(refRoom.getOthers()).toHaveLength(1);
      });

      const parentB = document.createElement("div");
      parentB.style.width = "800px";
      parentB.style.height = "400px";
      document.body.appendChild(parentB);

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(
              refRoom,
              refStorage.root.get("document")
            ),
            ...createLiveblocksPresencePlugin(
              refRoom,
              refStorage.root.get("document")
            ),
          ],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewB.destroy();
        parentB.remove();
      });

      const layoutRect = {
        left: 0,
        top: 0,
        right: 800,
        bottom: 400,
        width: 800,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
      vi.spyOn(viewB.scrollDOM, "getBoundingClientRect").mockReturnValue(
        layoutRect
      );
      vi.spyOn(viewB.contentDOM, "getBoundingClientRect").mockReturnValue(
        layoutRect
      );
      vi.spyOn(viewB, "coordsAtPos").mockImplementation((pos: number) => ({
        left: 8 + pos * 8,
        right: 9 + pos * 8,
        top: 20,
        bottom: 36,
      }));

      await new Promise<void>((resolve) => {
        viewB.requestMeasure({ read: () => null, write: () => resolve() });
      });

      expect(
        viewB.scrollDOM.querySelector(".lb-remote-caretLayer .lb-remote-caret")
      ).not.toBeNull();
    });

    test("remote presence renders carets in a layer, not inline widgets", async () => {
      const initialDoc = "a\nb";

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
        room: Room<Presence>;
        refRoom: Room<Presence>;
        storage: { root: LiveObject<{ document: LiveText }> };
        refStorage: { root: LiveObject<{ document: LiveText }> };
      };

      const parentB = document.createElement("div");
      parentB.style.width = "800px";
      parentB.style.height = "400px";
      document.body.appendChild(parentB);

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(
              refRoom,
              refStorage.root.get("document")
            ),
            ...createLiveblocksPresencePlugin(
              refRoom,
              refStorage.root.get("document")
            ),
          ],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewB.destroy();
        parentB.remove();
      });

      const layoutRect = {
        left: 0,
        top: 0,
        right: 800,
        bottom: 400,
        width: 800,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
      vi.spyOn(viewB.scrollDOM, "getBoundingClientRect").mockReturnValue(
        layoutRect
      );
      vi.spyOn(viewB.contentDOM, "getBoundingClientRect").mockReturnValue(
        layoutRect
      );
      vi.spyOn(viewB, "coordsAtPos").mockImplementation((pos: number) => ({
        left: 8 + pos * 8,
        right: 9 + pos * 8,
        top: 20,
        bottom: 36,
      }));

      const text = storage.root.get("document");
      room.updatePresence({
        selection: {
          anchor: text[kInternal].encodeIndex(1),
          head: text[kInternal].encodeIndex(1),
          version: text.version,
        },
      });

      await vi.waitFor(() => {
        expect(refRoom.getOthers()).toHaveLength(1);
      });

      await new Promise<void>((resolve) => {
        viewB.requestMeasure({ read: () => null, write: () => resolve() });
      });

      expect(viewB.contentDOM.querySelector(".lb-remote-caret")).toBeNull();
      expect(viewB.contentDOM.querySelector(".cm-widgetBuffer")).toBeNull();
      expect(
        viewB.scrollDOM.querySelector(".lb-remote-caretLayer .lb-remote-caret")
      ).not.toBeNull();
    });

    test("remote range selection renders in the selection layer", async () => {
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
        room: Room<Presence>;
        refRoom: Room<Presence>;
        storage: { root: LiveObject<{ document: LiveText }> };
        refStorage: { root: LiveObject<{ document: LiveText }> };
      };

      const parentB = document.createElement("div");
      parentB.style.width = "800px";
      parentB.style.height = "400px";
      document.body.appendChild(parentB);

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(
              refRoom,
              refStorage.root.get("document")
            ),
            ...createLiveblocksPresencePlugin(
              refRoom,
              refStorage.root.get("document")
            ),
          ],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewB.destroy();
        parentB.remove();
      });

      const layoutRect = {
        left: 0,
        top: 0,
        right: 800,
        bottom: 400,
        width: 800,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
      vi.spyOn(viewB.scrollDOM, "getBoundingClientRect").mockReturnValue(
        layoutRect
      );
      vi.spyOn(viewB.contentDOM, "getBoundingClientRect").mockReturnValue(
        layoutRect
      );
      vi.spyOn(viewB, "coordsAtPos").mockImplementation((pos: number) => ({
        left: 8 + pos * 8,
        right: 9 + pos * 8,
        top: 20,
        bottom: 36,
      }));

      const text = storage.root.get("document");
      room.updatePresence({
        selection: {
          anchor: text[kInternal].encodeIndex(0),
          head: text[kInternal].encodeIndex(5),
          version: text.version,
        },
      });

      await vi.waitFor(() => {
        expect(refRoom.getOthers()).toHaveLength(1);
      });

      await new Promise<void>((resolve) => {
        viewB.requestMeasure({ read: () => null, write: () => resolve() });
      });

      expect(viewB.contentDOM.querySelector(".lb-remote-selection")).toBeNull();
      expect(
        viewB.scrollDOM.querySelector(
          ".lb-remote-selectionLayer .lb-remote-selection"
        )
      ).not.toBeNull();
    });

    test("cleared remote presence removes layer carets", async () => {
      const initialDoc = "abc";

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
        room: Room<Presence>;
        refRoom: Room<Presence>;
        storage: { root: LiveObject<{ document: LiveText }> };
        refStorage: { root: LiveObject<{ document: LiveText }> };
      };

      const parentB = document.createElement("div");
      document.body.appendChild(parentB);

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(
              refRoom,
              refStorage.root.get("document")
            ),
            ...createLiveblocksPresencePlugin(
              refRoom,
              refStorage.root.get("document")
            ),
          ],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewB.destroy();
        parentB.remove();
      });

      const text = storage.root.get("document");
      room.updatePresence({
        selection: {
          anchor: text[kInternal].encodeIndex(1),
          head: text[kInternal].encodeIndex(1),
          version: text.version,
        },
      });

      await vi.waitFor(() => {
        expect(refRoom.getOthers()[0]?.presence.selection).not.toBeNull();
      });

      room.updatePresence({ selection: null });

      await vi.waitFor(() => {
        expect(refRoom.getOthers()[0]?.presence.selection).toBeNull();
      });

      await new Promise<void>((resolve) => {
        viewB.requestMeasure({ read: () => null, write: () => resolve() });
      });

      expect(
        viewB.scrollDOM.querySelector(".lb-remote-caretLayer .lb-remote-caret")
      ).toBeNull();
    });

    test("undecodable presence is rebased after storage catches up", async () => {
      const initialDoc = "abc";

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
        room: Room<Presence>;
        refRoom: Room<Presence>;
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
          extensions: [
            createLiveblocksSyncPlugin(room, storage.root.get("document")),
            ...createLiveblocksPresencePlugin(
              room,
              storage.root.get("document")
            ),
          ],
        }),
        parent: parentA,
      });

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(
              refRoom,
              refStorage.root.get("document")
            ),
            ...createLiveblocksPresencePlugin(
              refRoom,
              refStorage.root.get("document")
            ),
          ],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewA.destroy();
        viewB.destroy();
        parentA.remove();
        parentB.remove();
      });

      const text = refStorage.root.get("document");
      const decodeIndex = vi
        .spyOn(text[kInternal], "decodeIndex")
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      room.updatePresence({
        selection: {
          anchor: storage.root.get("document")[kInternal].encodeIndex(2),
          head: storage.root.get("document")[kInternal].encodeIndex(2),
          version: storage.root.get("document").version + 1,
        },
      });

      await vi.waitFor(() => {
        expect(decodeIndex).toHaveBeenCalled();
      });

      decodeIndex.mockRestore();

      viewA.dispatch({ changes: { from: 0, to: 0, insert: "Z" } });

      await vi.waitFor(() => {
        expect(refStorage.root.get("document").toString()).toBe("Zabc");
      });

      expect(viewA).toBeDefined();
      expect(viewB).toBeDefined();
    });
  });

  describe("multi-client", () => {
    test("deleting a newline adjacent to a remote caret succeeds", async () => {
      const initialDoc = "a\nb";

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
        room: Room<Presence>;
        refRoom: Room<Presence>;
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
          extensions: [
            createLiveblocksSyncPlugin(room, storage.root.get("document")),
            ...createLiveblocksPresencePlugin(
              room,
              storage.root.get("document")
            ),
          ],
        }),
        parent: parentA,
      });

      const viewB = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            createLiveblocksSyncPlugin(
              refRoom,
              refStorage.root.get("document")
            ),
            ...createLiveblocksPresencePlugin(
              refRoom,
              refStorage.root.get("document")
            ),
          ],
        }),
        parent: parentB,
      });

      onTestFinished(() => {
        viewA.destroy();
        viewB.destroy();
        parentA.remove();
        parentB.remove();
      });

      const text = storage.root.get("document");
      room.updatePresence({
        selection: {
          anchor: text[kInternal].encodeIndex(1),
          head: text[kInternal].encodeIndex(1),
          version: text.version,
        },
      });

      await vi.waitFor(() => {
        expect(refRoom.getOthers()).toHaveLength(1);
      });

      viewB.dispatch({
        selection: EditorSelection.cursor(2),
        changes: { from: 1, to: 2 },
      });

      const editorTextB = viewB.state.doc.toString();

      expect(editorTextB).toBe("ab");
      expect(viewB.contentDOM.querySelector(".cm-widgetBuffer")).toBeNull();

      expect(viewA).toBeDefined();
    });
  });
});
