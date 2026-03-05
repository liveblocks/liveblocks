/**
 * LiveList tests that use a MockWebSocket server for precise control over
 * wire-level operations. Covers CRDT conflict resolution, reconnection
 * behavior, and internal methods that need deterministic node IDs.
 *
 * For normal storage/presence/history tests, see LiveList.devserver.test.ts.
 */
import { describe, expect, onTestFinished, test, vi } from "vitest";

import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  createSerializedRoot,
  FIFTH_POSITION,
  FIRST_POSITION,
  FOURTH_POSITION,
  prepareIsolatedStorageTest,
  replaceRemoteStorageAndReconnect,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../../__tests__/_MockWebSocketServer.setup";
import {
  waitUntilStatus,
  waitUntilStorageUpdate,
} from "../../__tests__/_waitUtils";
import { kInternal } from "../../internal";
import type { ServerWireOp } from "../../protocol/Op";
import { OpCode } from "../../protocol/Op";
import { ServerMsgCode } from "../../protocol/ServerMsg";
import type { StorageNode } from "../../protocol/StorageNode";
import { CrdtType } from "../../protocol/StorageNode";
import { WebsocketCloseCodes } from "../../types/IWebSocket";
import type { LiveList } from "../LiveList";
import type { LiveObject } from "../LiveObject";

/**
 * Injects server operations directly into the room's message handler,
 * bypassing the MockWebSocket transport layer.
 */
function simulateRemoteOps(
  room: { [kInternal]: { simulate: { incomingMessage(data: string): void } } },
  ops: ServerWireOp[]
) {
  room[kInternal].simulate.incomingMessage(
    JSON.stringify({ type: ServerMsgCode.UPDATE_STORAGE, ops })
  );
}

describe("LiveList edge cases", () => {
  describe("conflict", () => {
    test("list conflicts", async () => {
      const { room, root, expectStorage } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      // Register id = 1:0
      items.push("0");

      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);

      expectStorage({
        items: ["1", "0"],
      });

      // Fix from backend
      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: SECOND_POSITION,
        },
      ]);

      expectStorage({
        items: ["1", "0"],
      });
    });

    test("list conflicts 2", async () => {
      const { room, root, expectStorage } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      items.push("x0"); // Register id = 1:0
      items.push("x1"); // Register id = 1:1

      // Should go to pending
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "y0",
        },
      ]);

      expectStorage({
        items: ["y0", "x0", "x1"],
      });

      // Should go to pending
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:1",
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "y1",
        },
      ]);

      expectStorage({
        items: ["y0", "x0", "y1", "x1"],
      });

      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: THIRD_POSITION,
        },
      ]);

      expectStorage({
        items: ["y0", "y1", "x0", "x1"],
      });

      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      expectStorage({
        items: ["y0", "y1", "x0", "x1"],
      });
    });

    test("list conflicts with offline", async () => {
      const { room, root, expectStorage, wss } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      // Register id = 1:0
      items.push("0");

      expectStorage({
        items: ["0"],
      });

      replaceRemoteStorageAndReconnect(wss, [
        createSerializedRoot(),
        createSerializedList("0:1", "root", "items"),
        createSerializedRegister("2:0", "0:1", FIRST_POSITION, "1"),
      ]);

      await waitUntilStorageUpdate(room);
      expectStorage({
        items: ["1", "0"],
      });

      // Fix from backend
      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: SECOND_POSITION,
        },
      ]);

      expectStorage({
        items: ["1", "0"],
      });
    });

    // This test uses the wss-based applyRemoteOperations (not injectRemoteOps)
    // because the reconnection cycle affects how the room buffers ops.
    test("list conflicts with undo redo and remote change", async () => {
      const { root, expectStorage, applyRemoteOperations, room, wss } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
          ],
          1
        );

      wss.last.close(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );
      await waitUntilStatus(room, "connected");

      const items = root.get("items");

      items.push("0");
      expectStorage({ items: ["0"] });

      room.history.undo();
      expectStorage({ items: [] });

      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);
      expectStorage({ items: [] });

      room.history.redo();
      expectStorage({ items: ["0"] });

      await waitUntilStorageUpdate(room);
      expectStorage({ items: ["1", "0"] });
    });

    test("list conflicts - move", async () => {
      const { room, root, expectStorage } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      // Register id = 1:0
      items.push("A");
      // Register id = 1:1
      items.push("B");
      // Register id = 1:2
      items.push("C");

      expectStorage({
        items: ["A", "B", "C"],
      });

      items.move(0, 2);

      expectStorage({
        items: ["B", "C", "A"],
      });

      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      expectStorage({
        items: ["C", "B", "A"],
      });

      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: FIFTH_POSITION,
        },
      ]);

      expectStorage({
        items: ["C", "B", "A"],
      });
    });

    test("list conflicts - ack has different position that local item", async () => {
      const { room, root, expectStorage } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:0", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      items.push("B");

      expectStorage({
        items: ["B"],
      });

      // Other client created "A" at the same time but was processed first by the server.
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ]);
      // B is shifted to SECOND_POSITION

      // Other client deleted "A" right after creation.
      simulateRemoteOps(room, [
        {
          type: OpCode.DELETE_CRDT,
          id: "2:0",
        },
      ]);

      expectStorage({
        items: ["B"], // "B" is at SECOND_POSITION
      });

      // Server sends ackownledgment for "B" creation with different position/
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          opId: "1:0", // Ack
        },
      ]);

      expectStorage({
        items: ["B"], // "B" should at FIRST_POSITION
      });

      // Other client creates an item at the SECOND_POSITION
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "C",
        },
      ]);

      expectStorage({
        items: ["B", "C"],
      });
    });

    test("list conflicts - ack has different position that local and ack position is used", async () => {
      const { room, root, expectStorage } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:0", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      items.push("B");

      expectStorage({
        items: ["B"],
      });

      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ]);

      simulateRemoteOps(room, [
        {
          type: OpCode.DELETE_CRDT,
          id: "2:0",
        },
      ]);

      items.insert("C", 0); // Insert at FIRST_POSITION

      // Ack
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          opId: "1:0", // Ack
        },
      ]);

      expectStorage({
        items: ["B", "C"], // C position is shifted
      });
    });

    // Regression test: #applySetChildKeyAck must return modified when restoring
    // items from implicitlyDeletedItems, otherwise subscriptions won't fire.
    test("restoring item from implicitlyDeletedItems triggers subscription", async () => {
      const { room, root, expectStorage } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedRoot(),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "a"),
            createSerializedRegister("0:2", "0:0", SECOND_POSITION, "b"),
            createSerializedRegister("0:3", "0:0", THIRD_POSITION, "c"),
          ],
          1
        );

      const items = root.get("items");
      items.delete(0);
      items.move(1, 0);
      expectStorage({ items: ["c", "b"] });

      // Remote set at "a"'s position moves "c" to implicitlyDeletedItems
      simulateRemoteOps(room, [
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "X",
          intent: "set",
          deletedId: "0:1",
        },
      ]);
      expectStorage({ items: ["X", "b"] });

      // Start listening for subscription updates
      const onStorage = vi.fn();
      onTestFinished(room.events.storageBatch.subscribe(onStorage));

      // Ack restores "c" from implicitlyDeletedItems - this MUST trigger subscription
      simulateRemoteOps(room, [
        {
          type: OpCode.SET_PARENT_KEY,
          id: "0:3",
          parentKey: SECOND_POSITION,
          opId: "1:1",
        },
      ]);

      expectStorage({ items: ["X", "c", "b"] });
      expect(onStorage).toHaveBeenCalled();
    });
  });

  describe("reconnect with remote changes and subscribe", () => {
    test("register added to list", async () => {
      const { expectStorage, room, root, wss } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          ],
          1
        );

      const rootCallback = vi.fn();
      const rootDeepCallback = vi.fn();
      const listCallback = vi.fn();

      const listItems = root.get("items");

      onTestFinished(room.subscribe(root, rootCallback));
      onTestFinished(room.subscribe(root, rootDeepCallback, { isDeep: true }));
      onTestFinished(room.subscribe(listItems, listCallback));

      expectStorage({ items: ["a"] });

      const newInitStorage: StorageNode[] = [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "a",
          },
        ],
        [
          "2:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "b",
          },
        ],
      ];

      replaceRemoteStorageAndReconnect(wss, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        items: ["a", "b"],
      });

      listItems.push("c");

      expectStorage({
        items: ["a", "b", "c"],
      });

      expect(rootCallback).toHaveBeenCalledTimes(0);

      expect(rootDeepCallback).toHaveBeenCalledTimes(2);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 1, item: "b", type: "insert" }],
        },
      ]);
      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 2, item: "c", type: "insert" }],
        },
      ]);
      expect(listCallback).toHaveBeenCalledTimes(2);
    });

    test("register moved in list", async () => {
      const { expectStorage, room, root, wss } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
            createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
          ],
          1
        );

      const rootCallback = vi.fn();
      const rootDeepCallback = vi.fn();
      const listCallback = vi.fn();

      const listItems = root.get("items");

      onTestFinished(room.subscribe(root, rootCallback));
      onTestFinished(room.subscribe(root, rootDeepCallback, { isDeep: true }));
      onTestFinished(room.subscribe(listItems, listCallback));

      expectStorage({ items: ["a", "b"] });

      const newInitStorage: StorageNode[] = [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "a",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "b",
          },
        ],
      ];

      replaceRemoteStorageAndReconnect(wss, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        items: ["b", "a"],
      });

      expect(rootCallback).toHaveBeenCalledTimes(0);

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 0, previousIndex: 1, item: "b", type: "move" }],
        },
      ]);

      expect(listCallback).toHaveBeenCalledTimes(1);
    });

    test("register deleted from list", async () => {
      const { expectStorage, room, root, wss } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
            createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
          ],
          1
        );

      const rootCallback = vi.fn();
      const rootDeepCallback = vi.fn();
      const listCallback = vi.fn();

      const listItems = root.get("items");

      onTestFinished(room.subscribe(root, rootCallback));
      onTestFinished(room.subscribe(root, rootDeepCallback, { isDeep: true }));
      onTestFinished(room.subscribe(listItems, listCallback));

      expectStorage({ items: ["a", "b"] });

      const newInitStorage: StorageNode[] = [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "a",
          },
        ],
      ];

      replaceRemoteStorageAndReconnect(wss, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        items: ["a"],
      });

      expect(rootCallback).toHaveBeenCalledTimes(0);

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 1, type: "delete", deletedItem: "b" }],
        },
      ]);

      expect(listCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedRoot(),
          createSerializedList("0:1", "root", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
          createSerializedObject("0:3", { a: 2 }, "0:1", SECOND_POSITION),
        ],
        1
      );

      const items = root.get("items");
      const secondItem = items.get(1);

      const applyResult = items._detachChild(secondItem!);

      expect(applyResult).toEqual({
        modified: {
          type: "LiveList",
          node: items,
          updates: [{ index: 1, type: "delete", deletedItem: secondItem }],
        },
        reverse: [
          {
            data: { a: 2 },
            id: "0:3",
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });

    describe("apply CreateRegister", () => {
      test('with intent "set" should replace existing item', async () => {
        const { room, expectStorage } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
            [
              createSerializedRoot(),
              createSerializedList("0:0", "root", "items"),
              createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
            ],
            1
          );

        expectStorage({
          items: ["A"],
        });

        simulateRemoteOps(room, [
          {
            type: OpCode.CREATE_REGISTER,
            id: "0:2",
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "B",
            intent: "set",
          },
        ]);

        expectStorage({
          items: ["B"],
        });
      });

      test('with intent "set" should notify with a "set" update', async () => {
        const { room, root } = await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedRoot(),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
          ],
          1
        );

        const items = root.get("items");

        const callback = vi.fn();
        onTestFinished(room.events.storageBatch.subscribe(callback));

        simulateRemoteOps(room, [
          {
            type: OpCode.CREATE_REGISTER,
            id: "0:2",
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "B",
            intent: "set",
          },
        ]);

        expect(callback).toHaveBeenCalledWith([
          {
            node: items,
            type: "LiveList",
            updates: [{ type: "set", index: 0, item: "B" }],
          },
        ]);
      });

      test('with intent "set" should insert item if conflict with a delete operation', async () => {
        const { room, root, expectStorage } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
            [
              createSerializedRoot(),
              createSerializedList("0:0", "root", "items"),
              createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
            ],
            1
          );

        const items = root.get("items");

        expectStorage({
          items: ["A"],
        });

        items.delete(0);

        expectStorage({
          items: [],
        });

        simulateRemoteOps(room, [
          {
            type: OpCode.CREATE_REGISTER,
            id: "0:2",
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "B",
            intent: "set",
          },
        ]);

        expectStorage({
          items: ["B"],
        });
      });

      test('with intent "set" should notify with a "insert" update if no item exists at this position', async () => {
        const { room, root } = await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedRoot(),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
          ],
          1
        );

        const items = root.get("items");
        items.delete(0);

        const callback = vi.fn();
        onTestFinished(room.subscribe(items, callback, { isDeep: true }));

        simulateRemoteOps(room, [
          {
            type: OpCode.CREATE_REGISTER,
            id: "0:2",
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "B",
            intent: "set",
          },
        ]);

        expect(callback).toHaveBeenCalledWith([
          {
            node: items,
            type: "LiveList",
            updates: [{ type: "insert", index: 0, item: "B" }],
          },
        ]);
      });

      test("on existing position should give the right update", async () => {
        const { room, root, expectStorage } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
            [
              createSerializedRoot(),
              createSerializedList("0:1", "root", "items"),
            ],
            1
          );

        const items = root.get("items");

        // Register id = 1:0
        items.push("0");

        expectStorage({
          items: ["0"],
        });

        const callback = vi.fn();
        onTestFinished(room.subscribe(items, callback, { isDeep: true }));

        simulateRemoteOps(room, [
          {
            type: OpCode.CREATE_REGISTER,
            id: "2:1",
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "1",
          },
        ]);

        expectStorage({
          items: ["1", "0"],
        });

        expect(callback).toHaveBeenCalledWith([
          {
            node: items,
            type: "LiveList",
            updates: [{ type: "insert", index: 0, item: "1" }],
          },
        ]);
      });
    });
  });
});
