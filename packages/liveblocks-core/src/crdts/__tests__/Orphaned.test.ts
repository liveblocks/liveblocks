import { afterEach, describe, expect, test, vi } from "vitest";

import * as console from "../../lib/fancy-console";
import { OpCode } from "../../protocol/Op";
import { createManagedPool } from "../AbstractCrdt";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";
import { LiveText } from "../LiveText";
import type { LiveStructure } from "../Lson";
import { REMOTE } from "../StorageUpdates";

const ORPHANED_NODE_WARNING =
  "Cannot sync changes made to this Live structure because it is no longer part of Storage. Retrieve the current value from its parent before mutating it.";

function orphan<T extends LiveStructure>(node: T): T {
  const pool = createManagedPool({ getCurrentConnectionId: () => 0 });
  const root = new LiveObject<{ child?: T }>({ child: node });
  root._attach("root", pool);
  root.delete("child");
  return node;
}

describe("orphaned Live structures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("a replaced LiveText warns when mutated", () => {
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
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    text.insert(0, "lost");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(ORPHANED_NODE_WARNING);
    expect(text.toString()).toBe("lost");
  });

  test("LiveText mutations warn once", () => {
    const text = orphan(new LiveText("abc"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    text.insert(1, "x");
    text.delete(1, 1);
    text.replace(1, 1, "x");
    text.format(1, 1, { bold: true });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(ORPHANED_NODE_WARNING);
    expect(text.toString()).toBe("axc");
  });

  test("LiveObject mutations warn once", () => {
    const object = orphan(
      new LiveObject<{ local?: number; value: number }>({ value: 0 })
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    object.set("value", 1);
    object.setLocal("local", 1);
    object.update({ value: 1 });
    object.delete("value");
    object.reconcile({ value: 1 });
    object.reconcilePartially({ value: 1 });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(ORPHANED_NODE_WARNING);
    expect(object.toJSON()).toEqual({ value: 1 });
  });

  test("LiveMap mutations warn once", () => {
    const map = orphan(new LiveMap<string, number>([["value", 0]]));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    map.set("value", 1);
    map.delete("value");

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(ORPHANED_NODE_WARNING);
    expect(map.toJSON()).toEqual({});
  });

  test("LiveList mutations warn once", () => {
    const list = orphan(new LiveList([0, 1]));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    list.push(2);
    list.insert(2, 1);
    list.move(0, 1);
    list.delete(0);
    list.clear();
    list.push(1);
    list.set(0, 2);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(ORPHANED_NODE_WARNING);
    expect(list.toJSON()).toEqual([2]);
  });
});
