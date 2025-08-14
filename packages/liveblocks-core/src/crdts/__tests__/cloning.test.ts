import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  listUpdate,
  listUpdateInsert,
  objectUpdate,
} from "../../__tests__/_updatesUtils";
import {
  createSerializedList,
  createSerializedObject,
  prepareStorageUpdateTest,
} from "../../__tests__/_utils";
import { cloneLson } from "../../crdts/liveblocks-helpers";
import type { LiveList } from "../LiveList";
import { liveStructure, lson } from "./_arbitraries";

describe("cloning LiveStructures", () => {
  test("basic cloning logic", async () => {
    const { root, expectUpdates, room } = await prepareStorageUpdateTest<{
      list1: LiveList<string>;
      list2: LiveList<string>;
    }>([
      createSerializedObject("0:0", {}),
      createSerializedList("0:1", "0:0", "list1"),
    ]);

    const list1 = root.get("list1");
    list1.push("a");
    list1.push("b");
    list1.push("c");
    root.set("list2", list1.clone());

    room.history.undo();
    room.history.redo();

    expectUpdates([
      // List creation
      [listUpdate(["a"], [listUpdateInsert(0, "a")])],
      [listUpdate(["a", "b"], [listUpdateInsert(1, "b")])],
      [listUpdate(["a", "b", "c"], [listUpdateInsert(2, "c")])],

      // Clone
      [
        objectUpdate(
          { list1: ["a", "b", "c"], list2: ["a", "b", "c"] },
          { list2: { type: "update" } }
        ),
      ],

      // Undo
      [
        objectUpdate({ list1: ["a", "b", "c"] }, {
          list2: { type: "delete" },
        } as any),
      ],

      // Redo
      [
        objectUpdate(
          { list1: ["a", "b", "c"], list2: ["a", "b", "c"] },
          { list2: { type: "update" } }
        ),
      ],
    ]);
  });

  test("deep cloning of LiveStructures", () =>
    fc.assert(
      fc.asyncProperty(
        liveStructure,

        async (data) => {
          const { root } = await prepareStorageUpdateTest([
            createSerializedObject("0:0", {}),
          ]);

          // Clone "a" to "b"
          root.set("a", data);
          root.set("b", data.clone());

          const imm = root.toImmutable();
          expect(imm.a).toEqual(imm.b);
        }
      )
    ));

  test("deep cloning of LiveStructures (twice)", () =>
    fc.assert(
      fc.asyncProperty(
        liveStructure,

        async (data) => {
          const { root } = await prepareStorageUpdateTest([
            createSerializedObject("0:0", {}),
          ]);

          // Clone "a" to "b"
          root.set("a", data);
          root.set("b", data.clone().clone());
          //                        ^^^^^^^^ Deliberately cloning twice in this test

          const imm = root.toImmutable();
          expect(imm.a).toEqual(imm.b);
        }
      )
    ));

  test("deep cloning of LSON data (= LiveStructures or JSON)", () =>
    fc.assert(
      fc.asyncProperty(
        lson,

        async (data) => {
          const { root } = await prepareStorageUpdateTest([
            createSerializedObject("0:0", {}),
          ]);

          // Clone "a" to "b"
          root.set("a", data);
          root.set("b", cloneLson(data));
          //            ^^^^^^^^^ Much like data.clone(), but generalized to
          //                      work on _any_ LSON value, even if data is
          //                      a JSON value

          const imm = root.toImmutable();
          expect(imm.a).toEqual(imm.b);
        }
      )
    ));
});
