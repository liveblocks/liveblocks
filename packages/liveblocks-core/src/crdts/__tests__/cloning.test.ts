import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  listUpdate,
  listUpdateInsert,
  objectUpdate,
} from "../../__tests__/_updatesUtils";
import {
  createSerializedList,
  createSerializedRoot,
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
    }>([createSerializedRoot(), createSerializedList("0:1", "root", "list1")]);

    const list1 = root.get("list1");
    list1.push("a");
    list1.push("b");
    list1.push("c");
    const clonedList = list1.clone();
    root.set("list2", clonedList);

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
          list2: { type: "delete", deletedItem: clonedList },
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

  test("[property] deep cloning of LiveStructures", () =>
    fc.assert(
      fc.asyncProperty(
        liveStructure,

        async (data) => {
          const { root } = await prepareStorageUpdateTest([
            createSerializedRoot(),
          ]);

          // Clone "a" to "b"
          root.set("a", data);
          root.set("b", data.clone());

          const imm = root.toImmutable();
          expect(imm.a).toEqual(imm.b);
        }
      )
    ));

  test("[property] deep cloning of LiveStructures (twice)", () =>
    fc.assert(
      fc.asyncProperty(
        liveStructure,

        async (data) => {
          const { root } = await prepareStorageUpdateTest([
            createSerializedRoot(),
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

  test("[property] deep cloning of LSON data (= LiveStructures or JSON)", () =>
    fc.assert(
      fc.asyncProperty(
        lson,

        async (data) => {
          const { root } = await prepareStorageUpdateTest([
            createSerializedRoot(),
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
