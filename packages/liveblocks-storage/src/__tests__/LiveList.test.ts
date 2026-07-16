import { describe, expect, test, vi } from "vitest";

import { LiveList } from "../crdts/LiveList";
import { LiveObject } from "../crdts/LiveObject";
import { OpCode } from "../protocol/Op";
import { StorageDoc } from "../StorageDoc";

describe("StorageDoc + LiveList", () => {
  test("attach, mutate, and subscribe emits ops with opIds", () => {
    const doc = new StorageDoc({ getActorId: () => 7 });
    const list = new LiveList<string>(["a"]);
    doc.attach(list, "root-list");

    const events: unknown[] = [];
    const stop = doc.subscribe((event) => {
      events.push(event.ops);
    });

    list.push("b");

    expect(list.toJSON()).toEqual(["a", "b"]);
    expect(events).toHaveLength(1);

    const ops = events[0] as { type: number; opId: string; id: string }[];
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0]?.opId).toMatch(/^7:/);
    expect(ops.some((op) => op.type === OpCode.CREATE_REGISTER)).toBe(true);

    // Pending tracks emitted ops until confirmed
    expect(doc.pending.size).toBeGreaterThan(0);
    for (const op of ops) {
      doc.confirm(op.opId);
    }
    expect(doc.pending.size).toBe(0);

    stop();
  });

  test("nested LiveList under LiveObject", () => {
    const doc = new StorageDoc();
    const root = new LiveObject({ items: new LiveList(["x"]) });
    doc.attach(root, "root");

    const listener = vi.fn();
    doc.subscribe(listener);

    root.get("items")!.push("y");

    expect(root.toJSON()).toEqual({ items: ["x", "y"] });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("writable: false blocks mutations", () => {
    const doc = new StorageDoc({ writable: false });
    const list = new LiveList<string>([]);
    doc.attach(list);

    expect(() => list.push("nope")).toThrow(/read only/i);
  });

  test("detached list can be built and later attached", () => {
    const list = new LiveList<string>(["one", "two"]);
    expect(list.toJSON()).toEqual(["one", "two"]);
    expect(list._id).toBeUndefined();

    const doc = new StorageDoc();
    const ops: unknown[] = [];
    doc.subscribe((e) => ops.push(...e.ops));
    doc.attach(list);

    list.insert("zero", 0);
    expect(list.toJSON()).toEqual(["zero", "one", "two"]);
    expect(ops.length).toBeGreaterThan(0);
  });
});
