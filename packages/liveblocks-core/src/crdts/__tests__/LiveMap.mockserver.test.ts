/**
 * LiveMap tests that use a MockWebSocket server for precise control over
 * wire-level operations. Covers internal methods that need deterministic
 * node IDs.
 *
 * For normal storage/presence/history tests, see LiveMap.devserver.test.ts.
 */
import { describe, expect, test } from "vitest";

import {
  createSerializedMap,
  createSerializedObject,
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../__tests__/_utils";
import { OpCode } from "../../protocol/Op";
import type { LiveMap } from "../LiveMap";
import type { LiveObject } from "../LiveObject";

describe("LiveMap edge cases", () => {
  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedRoot(),
          createSerializedMap("0:1", "root", "map"),
          createSerializedObject("0:2", { a: 1 }, "0:1", "el1"),
          createSerializedObject("0:3", { a: 2 }, "0:1", "el2"),
        ],
        1
      );

      const map = root.get("map");
      const secondItem = map.get("el2");

      const applyResult = map._detachChild(secondItem!);

      expect(applyResult).toEqual({
        modified: {
          node: map,
          type: "LiveMap",
          updates: { el2: { type: "delete", deletedItem: secondItem } },
        },
        reverse: [
          {
            data: { a: 2 },
            id: "0:3",
            parentId: "0:1",
            parentKey: "el2",
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });
  });
});
