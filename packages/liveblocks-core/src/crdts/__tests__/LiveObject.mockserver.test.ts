/**
 * LiveObject tests that use a MockWebSocket server for precise control over
 * wire-level operations. Covers ack mechanism edge cases and internal methods
 * that need deterministic node IDs.
 *
 * For normal storage/presence/history tests, see LiveObject.devserver.test.ts.
 */
import { describe, expect, test } from "vitest";

import {
  createSerializedList,
  createSerializedObject,
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../__tests__/_MockWebSocketServer.setup";
import { kInternal } from "../../internal";
import type { ServerWireOp } from "../../protocol/Op";
import { OpCode } from "../../protocol/Op";
import { ServerMsgCode } from "../../protocol/ServerMsg";
import { LiveList } from "../LiveList";
import { LiveObject } from "../LiveObject";

/**
 * Injects server operations directly into the room's message handler,
 * bypassing the MockWebSocket transport layer.
 */
function injectRemoteOps(
  room: { [kInternal]: { simulate: { incomingMessage(data: string): void } } },
  ops: ServerWireOp[]
) {
  room[kInternal].simulate.incomingMessage(
    JSON.stringify({ type: ServerMsgCode.UPDATE_STORAGE, ops })
  );
}

describe("LiveObject edge cases", () => {
  describe("acknowledge mechanism", () => {
    describe("should ignore incoming updates if the current op has not been acknowledged", () => {
      test("when value is not a crdt", async () => {
        const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
          a: number;
        }>([createSerializedRoot({ a: 0 })], 1);

        expectStorage({ a: 0 });

        root.set("a", 1);

        expectStorage({ a: 1 });

        injectRemoteOps(room, [
          {
            type: OpCode.UPDATE_OBJECT,
            data: { a: 2 },
            id: "root",
          },
        ]);

        expectStorage({ a: 1 });
      });

      test("when value is a LiveObject", async () => {
        const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
          a: LiveObject<{ subA: number }>;
        }>(
          [
            createSerializedRoot(),
            createSerializedObject("0:1", { subA: 0 }, "root", "a"),
          ],
          1
        );

        expectStorage({ a: { subA: 0 } });

        root.set("a", new LiveObject({ subA: 1 }));

        expectStorage({ a: { subA: 1 } });

        injectRemoteOps(room, [
          {
            type: OpCode.CREATE_OBJECT,
            data: { subA: 2 },
            id: "2:0",
            parentKey: "a",
            parentId: "root",
          },
        ]);

        expectStorage({ a: { subA: 1 } });
      });

      test("when value is a LiveList with LiveObjects", async () => {
        const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
          a: LiveList<LiveObject<{ b: number }>>;
        }>(
          [createSerializedRoot(), createSerializedList("0:1", "root", "a")],
          1
        );

        expectStorage({ a: [] });

        const newList = new LiveList<LiveObject<{ b: number }>>([]);
        newList.push(new LiveObject({ b: 1 }));
        root.set("a", newList);

        expectStorage({ a: [{ b: 1 }] });

        injectRemoteOps(room, [
          {
            type: OpCode.CREATE_LIST,
            id: "2:0",
            parentKey: "a",
            parentId: "root",
          },
        ]);

        expectStorage({ a: [{ b: 1 }] });
      });
    });
  });

  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        obj: LiveObject<{
          a: LiveObject<{ subA: number }>;
          b: LiveObject<{ subA: number }>;
        }>;
      }>(
        [
          createSerializedRoot(),
          createSerializedObject("0:1", {}, "root", "obj"),
          createSerializedObject("0:2", { subA: 1 }, "0:1", "a"),
          createSerializedObject("0:3", { subA: 2 }, "0:1", "b"),
        ],
        1
      );

      const obj = root.get("obj");
      const secondItem = obj.get("b");

      const applyResult = obj._detachChild(secondItem);

      expect(applyResult).toEqual({
        modified: {
          node: obj,
          type: "LiveObject",
          updates: { b: { type: "delete" } },
        },
        reverse: [
          {
            data: { subA: 2 },
            id: "0:3",
            parentId: "0:1",
            parentKey: "b",
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });
  });
});
