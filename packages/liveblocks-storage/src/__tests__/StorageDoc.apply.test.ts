import { describe, expect, test } from "vitest";

import { OpSource } from "../crdts/AbstractCrdt";
import { LiveList } from "../crdts/LiveList";
import { LiveObject } from "../crdts/LiveObject";
import type { ClientWireOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import { StorageDoc } from "../StorageDoc";

function stripOpIds(ops: readonly ClientWireOp[]): Op[] {
  return ops.map(({ opId: _opId, ...rest }) => rest);
}

describe("StorageDoc.apply + hydrate", () => {
  test("peer B applies stripped ops from A and converges", () => {
    const docA = new StorageDoc({ getActorId: () => 1 });
    const rootA = new LiveObject({ items: new LiveList<string>([]) });
    docA.attach(rootA, "root");

    // Second client joins from a snapshot (same node ids), then receives ops
    const { doc: docB, root: rootB } = StorageDoc.fromNodes(docA.toNodeStream(), {
      getActorId: () => 2,
    });

    const outbound: ClientWireOp[] = [];
    docA.subscribe((e) => {
      outbound.push(...e.ops);
    });

    rootA.get("items")!.push("hello");
    rootA.get("items")!.push("world");

    const { updates } = docB.apply(stripOpIds(outbound));
    expect(updates.size).toBeGreaterThan(0);
    expect(rootB.toJSON()).toEqual(rootA.toJSON());
    expect(rootB.toJSON()).toEqual({ items: ["hello", "world"] });
  });

  test("ours ack confirms pending then applies", () => {
    const doc = new StorageDoc({ getActorId: () => 3 });
    const list = new LiveList<string>([]);
    doc.attach(list, "list");

    const sent: ClientWireOp[] = [];
    doc.subscribe((e) => {
      sent.push(...e.ops);
    });

    list.push("x");
    expect(doc.pending.size).toBeGreaterThan(0);

    // Server echo: same ops with opIds → OURS path confirms pending
    doc.apply(sent);
    expect(doc.pending.size).toBe(0);
    expect(list.toJSON()).toEqual(["x"]);
  });

  test("fromNodes / toNodeStream round-trip", () => {
    const docA = new StorageDoc({ getActorId: () => 1 });
    const rootA = new LiveObject({
      title: "doc",
      items: new LiveList(["a", "b"]),
    });
    docA.attach(rootA, "root");

    const snapshot = docA.toNodeStream();
    const { doc: docB, root: rootB } = StorageDoc.fromNodes(snapshot, {
      getActorId: () => 2,
    });

    expect(rootB.toJSON()).toEqual(rootA.toJSON());
    expect(docB.root).toBe(rootB);
    expect(docB.nodes.size).toBe(docA.nodes.size);
  });

  test("load refuses non-empty docs", () => {
    const doc = new StorageDoc();
    doc.attach(new LiveObject({}), "root");
    expect(() => doc.load([["root", { type: 0, data: {} }]])).toThrow(
      /already has nodes/
    );
  });

  test("forced LOCAL source still applies", () => {
    const doc = new StorageDoc({ getActorId: () => 1 });
    const root = new LiveObject({ items: new LiveList<string>([]) });
    doc.attach(root, "root");

    const createRegister: Op = {
      type: OpCode.CREATE_REGISTER,
      id: "1:99",
      parentId: root.get("items")!._id!,
      parentKey: "!",
      data: "z",
    };

    // Need list id - after attach, items has an id
    const listId = root.get("items")!._id;
    expect(listId).toBeDefined();

    doc.apply(
      [
        {
          ...createRegister,
          parentId: listId!,
        },
      ],
      { source: OpSource.THEIRS }
    );

    expect(root.toJSON()).toEqual({ items: ["z"] });
  });
});
