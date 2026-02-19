/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Json, NodeStream, StorageNode } from "@liveblocks/core";
import { CrdtType, makePosition } from "@liveblocks/core";
import fc from "fast-check";
import { reduce } from "itertools";

import type { IReadableSnapshot } from "~";
import {
  snapshotToLossyJson_eager,
  snapshotToLossyJson_lazy,
} from "~/formats/LossyJson";
import { makeInMemorySnapshot as makeSnapshot } from "~/makeInMemorySnapshot";
import { generateArbitraries } from "~test/plugins/_generateFullTestSuite";

function consume(gen: Iterable<string>): string {
  return reduce(gen, (x, y) => x + y, "");
}

function snapshotToLossyJson(snapshot: IReadableSnapshot) {
  return JSON.parse(consume(snapshotToLossyJson_lazy(snapshot))) as Json;
}

const FIRST_POSITION = makePosition();
const SECOND_POSITION = makePosition(FIRST_POSITION);

describe("Serialization of nodes (to LossyJson format)", () => {
  test("empty storage", () => {
    const snapshot = makeSnapshot([]);
    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({});
  });

  test("With root node", () => {
    // prettier-ignore
    const snapshot = makeSnapshot([
      ["root", { data: { ver: 1 }, type: 0 }],
      ["si:1", { data: { a: 1 }, parentId: "root", parentKey: "child", type: 0 }],
      ["si:2", { data: { b: 2 }, parentId: "si:1", parentKey: "subchild1", type: 0 }],
      ["si:3", { data: { c: 2 }, parentId: "si:1", parentKey: "subchild2", type: 0 }],
      ["si:4", { data: { a: 1 }, parentId: "root", parentKey: "child2", type: 0 }],
    ]);

    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({
      ver: 1,
      child: {
        a: 1,
        subchild1: { b: 2 },
        subchild2: { c: 2 },
      },
      child2: { a: 1 },
    });
  });

  test("nested LiveObjects", () => {
    // prettier-ignore
    const snapshot = makeSnapshot([
      ["si:1", { data: { a: 1 }, parentId: "root", parentKey: "child", type: 0 }],
      ["si:2", { data: { b: 2 }, parentId: "si:1", parentKey: "subchild1", type: 0 }],
      ["si:3", { data: { c: 2 }, parentId: "si:1", parentKey: "subchild2", type: 0 }],
      ["si:4", { data: { a: 1 }, parentId: "root", parentKey: "child2", type: 0 }],
    ]);

    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({
      child: {
        a: 1,
        subchild1: { b: 2 },
        subchild2: { c: 2 },
      },
      child2: { a: 1 },
    });
  });

  test("LiveMaps With LiveObjects", () => {
    // prettier-ignore
    const snapshot = makeSnapshot([
      ["si:1", { parentId: "root", parentKey: "map1", type: CrdtType.MAP }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: "first", type: CrdtType.OBJECT }],
      ["si:3", { data: { a: 1 }, parentId: "si:1", parentKey: "second", type: CrdtType.OBJECT }],
      ["si:4", { data: { a: 2 }, parentId: "si:1", parentKey: "third", type: CrdtType.OBJECT }],
    ]);

    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({
      map1: {
        first: { a: 0 },
        second: { a: 1 },
        third: { a: 2 },
      },
    });
  });

  test("LiveList with LiveObjects", () => {
    // prettier-ignore
    const snapshot = makeSnapshot([
      ["si:1", { parentId: "root", parentKey: "list1", type: CrdtType.LIST }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: FIRST_POSITION, type: CrdtType.OBJECT }],
      ["si:3", { data: { a: 1 }, parentId: "si:1", parentKey: SECOND_POSITION, type: CrdtType.OBJECT }],
      ["si:4", { data: { a: 3 }, parentId: "si:3", parentKey: "subSecond", type: CrdtType.OBJECT }],
    ]);

    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({
      list1: [{ a: 0 }, { a: 1, subSecond: { a: 3 } }],
    });
  });

  test("LiveList with LiveRegisters", () => {
    // prettier-ignore
    const snapshot = makeSnapshot([
      ["si:1", { parentId: "root", parentKey: "list1", type: CrdtType.LIST }],
      ["si:2", { data: 0, parentId: "si:1", parentKey: FIRST_POSITION, type: CrdtType.REGISTER }],
      ["si:3", { data: 1, parentId: "si:1", parentKey: SECOND_POSITION, type: CrdtType.REGISTER }],
    ]);

    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({ list1: [0, 1] });
  });

  test("Empty LiveList and LiveMap and LiveObject", () => {
    // prettier-ignore
    const snapshot = makeSnapshot([
      ["si:1", { parentId: "root", parentKey: "list", type: CrdtType.LIST }],
      ["si:2", { data: {}, parentId: "root", parentKey: "obj", type: CrdtType.OBJECT }],
      ["si:3", { parentId: "root", parentKey: "map", type: CrdtType.MAP }],
    ]);

    const json = snapshotToLossyJson(snapshot);
    expect(json).toEqual({
      list: [],
      obj: {},
      map: {},
    });
  });
});

describe("streaming === nonstreaming equivalence", () => {
  function streamingResult(nodes: StorageNode[]): string {
    return consume(snapshotToLossyJson_lazy(makeSnapshot(nodes)));
  }

  function nonstreamingResult(nodes: StorageNode[]): string {
    return JSON.stringify(snapshotToLossyJson_eager(makeSnapshot(nodes)));
  }

  test("empty storage", () => {
    const nodes: StorageNode[] = [];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("flat object with static data", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["root", { data: { a: 1, b: "hello", c: null, d: true }, type: 0 }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("nested LiveObjects", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["root", { data: { ver: 1 }, type: 0 }],
      ["si:1", { data: { a: 1 }, parentId: "root", parentKey: "child", type: 0 }],
      ["si:2", { data: { b: 2 }, parentId: "si:1", parentKey: "subchild1", type: 0 }],
      ["si:3", { data: { c: 2 }, parentId: "si:1", parentKey: "subchild2", type: 0 }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("LiveList with LiveObjects and registers", () => {
    const FIRST = makePosition();
    const SECOND = makePosition(FIRST);
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list1", type: CrdtType.LIST }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: FIRST, type: CrdtType.OBJECT }],
      ["si:3", { data: 1, parentId: "si:1", parentKey: SECOND, type: CrdtType.REGISTER }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("LiveMap with LiveObjects", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "map1", type: CrdtType.MAP }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: "first", type: CrdtType.OBJECT }],
      ["si:3", { data: { a: 1 }, parentId: "si:1", parentKey: "second", type: CrdtType.OBJECT }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("empty LiveList, LiveMap, LiveObject", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list", type: CrdtType.LIST }],
      ["si:2", { parentId: "root", parentKey: "map", type: CrdtType.MAP }],
      ["si:3", { data: {}, parentId: "root", parentKey: "obj", type: CrdtType.OBJECT }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("deeply nested: Object > List > Object > Map > Object", () => {
    const FIRST = makePosition();
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { data: { x: 1 }, parentId: "root", parentKey: "level1", type: CrdtType.OBJECT }],
      ["si:2", { parentId: "si:1", parentKey: "items", type: CrdtType.LIST }],
      ["si:3", { data: { y: 2 }, parentId: "si:2", parentKey: FIRST, type: CrdtType.OBJECT }],
      ["si:4", { parentId: "si:3", parentKey: "lookup", type: CrdtType.MAP }],
      ["si:5", { data: { z: 3 }, parentId: "si:4", parentKey: "entry", type: CrdtType.OBJECT }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("LiveList with register values of various types", () => {
    const FIRST = makePosition();
    const SECOND = makePosition(FIRST);
    const THIRD = makePosition(SECOND);
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list", type: CrdtType.LIST }],
      ["si:2", { data: "string", parentId: "si:1", parentKey: FIRST, type: CrdtType.REGISTER }],
      ["si:3", { data: 42, parentId: "si:1", parentKey: SECOND, type: CrdtType.REGISTER }],
      ["si:4", { data: null, parentId: "si:1", parentKey: THIRD, type: CrdtType.REGISTER }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("LiveMap with register values", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "map", type: CrdtType.MAP }],
      ["si:2", { data: { nested: [1, 2, 3] }, parentId: "si:1", parentKey: "obj", type: CrdtType.REGISTER }],
      ["si:3", { data: "plain", parentId: "si:1", parentKey: "str", type: CrdtType.REGISTER }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("property: holds for any valid node stream", () => {
    const arb = generateArbitraries();
    fc.assert(
      fc.property(arb.nodeStream(), (nodeStream: NodeStream) => {
        const nodes = [...nodeStream];
        // Compare parsed JSON, not raw strings — JSON.stringify may reorder
        // integer-like keys (e.g. "0") before string keys, while the streaming
        // path always emits static data keys first.
        expect(JSON.parse(streamingResult(nodes))).toEqual(
          JSON.parse(nonstreamingResult(nodes))
        );
      })
    );
  });
});
