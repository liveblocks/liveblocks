import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { prepareStorageUpdateTest } from "../../__tests__/_liveblocks";
import {
  listUpdate,
  listUpdateInsert,
  objectUpdate,
} from "../../__tests__/_updatesUtils";
import { cloneLson } from "../../crdts/liveblocks-helpers";
import type { LsonObject } from "../../crdts/Lson";
import type { LiveList } from "../LiveList";
import { LiveObject } from "../LiveObject";
import { liveStructure, lson } from "./_arbitraries";

describe("cloning LiveStructures", () => {
  test("basic cloning logic", async () => {
    const {
      roomA: room,
      rootA: root,
      expectUpdates,
    } = await prepareStorageUpdateTest<{
      list1: LiveList<string>;
      list2: LiveList<string>;
    }>({
      liveblocksType: "LiveObject",
      data: { list1: { liveblocksType: "LiveList", data: [] } },
    });

    const list1 = root.get("list1");
    list1.push("a");
    list1.push("b");
    list1.push("c");
    const clonedList = list1.clone();
    root.set("list2", clonedList);

    room.history.undo();
    room.history.redo();

    await expectUpdates([
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
      fc.property(
        liveStructure,

        (data) => {
          const root = new LiveObject<LsonObject>({});

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
      fc.property(
        liveStructure,

        (data) => {
          const root = new LiveObject<LsonObject>({});

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
      fc.property(
        lson,

        (data) => {
          const root = new LiveObject<LsonObject>({});

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
