import { describe, expect, test } from "vitest";

import { OpCode } from "../../protocol/Op";
import { createManagedPool } from "../AbstractCrdt";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";
import { LiveText } from "../LiveText";
import type { LiveStructure } from "../Lson";
import { REMOTE } from "../StorageUpdates";

const ORPHANED_ERROR =
  "Cannot mutate this Live structure because it is no longer part of Storage. Retrieve the current value from its parent before mutating it.";

function orphan<T extends LiveStructure>(node: T): T {
  const pool = createManagedPool({ getCurrentConnectionId: () => 0 });
  const root = new LiveObject<{ child?: T }>({ child: node });
  root._attach("root", pool);
  root.delete("child");
  return node;
}

describe("orphaned Live structures", () => {
  test("a replaced LiveText can no longer be mutated", () => {
    const pool = createManagedPool({ getCurrentConnectionId: () => 0 });
    const text = new LiveText();
    const root = new LiveObject({ text });
    root._attach("root", pool);

    root._attachChild(
      {
        type: OpCode.CREATE_TEXT,
        id: "1:0",
        parentId: "root",
        parentKey: "text",
        data: [],
        version: 0,
      },
      REMOTE
    );

    expect(root.get("text")).not.toBe(text);
    expect(() => text.insert(0, "lost")).toThrow(ORPHANED_ERROR);
    expect(text.toString()).toBe("");
  });

  test("LiveText mutations throw", () => {
    const text = orphan(new LiveText("abc"));

    expect(() => text.insert(1, "x")).toThrow(ORPHANED_ERROR);
    expect(() => text.delete(1, 1)).toThrow(ORPHANED_ERROR);
    expect(() => text.replace(1, 1, "x")).toThrow(ORPHANED_ERROR);
    expect(() => text.format(1, 1, { bold: true })).toThrow(ORPHANED_ERROR);
    expect(text.toString()).toBe("abc");
  });

  test("LiveObject mutations throw", () => {
    const object = orphan(
      new LiveObject<{ local?: number; value: number }>({ value: 0 })
    );

    expect(() => object.set("value", 1)).toThrow(ORPHANED_ERROR);
    expect(() => object.setLocal("local", 1)).toThrow(ORPHANED_ERROR);
    expect(() => object.update({ value: 1 })).toThrow(ORPHANED_ERROR);
    expect(() => object.delete("value")).toThrow(ORPHANED_ERROR);
    expect(() => object.reconcile({ value: 1 })).toThrow(ORPHANED_ERROR);
    expect(() => object.reconcilePartially({ value: 1 })).toThrow(
      ORPHANED_ERROR
    );
    expect(object.toJSON()).toEqual({ value: 0 });
  });

  test("LiveMap mutations throw", () => {
    const map = orphan(new LiveMap<string, number>([["value", 0]]));

    expect(() => map.set("value", 1)).toThrow(ORPHANED_ERROR);
    expect(() => map.delete("value")).toThrow(ORPHANED_ERROR);
    expect(map.toJSON()).toEqual({ value: 0 });
  });

  test("LiveList mutations throw", () => {
    const list = orphan(new LiveList([0, 1]));

    expect(() => list.push(2)).toThrow(ORPHANED_ERROR);
    expect(() => list.insert(2, 1)).toThrow(ORPHANED_ERROR);
    expect(() => list.move(0, 1)).toThrow(ORPHANED_ERROR);
    expect(() => list.delete(0)).toThrow(ORPHANED_ERROR);
    expect(() => list.clear()).toThrow(ORPHANED_ERROR);
    expect(() => list.set(0, 2)).toThrow(ORPHANED_ERROR);
    expect(list.toJSON()).toEqual([0, 1]);
  });

  test("new unattached Live structures remain mutable", () => {
    const text = new LiveText("a");
    const object = new LiveObject({ value: 0 });
    const map = new LiveMap<string, number>([["value", 0]]);
    const list = new LiveList<number>([0]);

    text.insert(1, "b");
    object.set("value", 1);
    map.set("value", 1);
    list.push(1);

    expect(text.toString()).toBe("ab");
    expect(object.toJSON()).toEqual({ value: 1 });
    expect(map.toJSON()).toEqual({ value: 1 });
    expect(list.toJSON()).toEqual([0, 1]);
  });
});
