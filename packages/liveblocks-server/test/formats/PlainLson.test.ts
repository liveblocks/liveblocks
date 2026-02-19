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

import type {
  NodeMap,
  NodeStream,
  PlainLsonObject,
  SerializedCrdt,
  StorageNode,
} from "@liveblocks/core";
import { CrdtType, isRootStorageNode, makePosition } from "@liveblocks/core";
import fc from "fast-check";
import { reduce } from "itertools";

import type { IReadableSnapshot } from "~";
import {
  plainLsonToNodeStream,
  snapshotToPlainLson_eager,
  snapshotToPlainLson_lazy,
} from "~/formats/PlainLson";
import { makeInMemorySnapshot as makeSnapshot } from "~/makeInMemorySnapshot";
import { generateArbitraries } from "~test/plugins/_generateFullTestSuite";

function plainLsonToNodeMap(root: PlainLsonObject): NodeMap {
  return new Map<string, SerializedCrdt>(plainLsonToNodeStream(root));
}

function consume(gen: Iterable<string>): string {
  return reduce(gen, (x, y) => x + y, "");
}

function snapshotToPlainLson(snapshot: IReadableSnapshot): PlainLsonObject {
  return JSON.parse(
    consume(snapshotToPlainLson_lazy(snapshot))
  ) as PlainLsonObject;
}

const FIRST_POSITION = makePosition();
const SECOND_POSITION = makePosition(FIRST_POSITION);

describe("Serialization of nodes (to PlainLson format)", () => {
  test("empty storage", () => {
    const snapshot = makeSnapshot([]);

    const plainLson = snapshotToPlainLson(snapshot);
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {},
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    expect(convertedNodes).toEqual(
      new Map([["root", { data: {}, type: CrdtType.OBJECT }]])
    );
  });

  test("With root node", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["root", { data: { ver: 1 }, type: 0 }],
      ["si:1", { data: { a: 1 }, parentId: "root", parentKey: "child", type: 0 }],
      ["si:2", { data: { b: 2 }, parentId: "si:1", parentKey: "subchild1", type: 0 }],
      ["si:3", { data: { c: 2 }, parentId: "si:1", parentKey: "subchild2", type: 0 }],
      ["si:4", { data: { a: 1 }, parentId: "root", parentKey: "child2", type: 0 }],
    ];

    const plainLson = snapshotToPlainLson(makeSnapshot(nodes));
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {
        ver: 1,
        child: {
          liveblocksType: "LiveObject",
          data: {
            a: 1,
            subchild1: { liveblocksType: "LiveObject", data: { b: 2 } },
            subchild2: { liveblocksType: "LiveObject", data: { c: 2 } },
          },
        },
        child2: { liveblocksType: "LiveObject", data: { a: 1 } },
      },
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    expect(convertedNodes).toEqual(new Map<string, SerializedCrdt>(nodes));
  });

  test("nested LiveObjects", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { data: { a: 1 }, parentId: "root", parentKey: "child", type: 0 }],
      ["si:2", { data: { b: 2 }, parentId: "si:1", parentKey: "subchild1", type: 0 }],
      ["si:3", { data: { c: 2 }, parentId: "si:1", parentKey: "subchild2", type: 0 }],
      ["si:4", { data: { a: 1 }, parentId: "root", parentKey: "child2", type: 0 }],
    ];

    const plainLson = snapshotToPlainLson(makeSnapshot(nodes));
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {
        child: {
          liveblocksType: "LiveObject",
          data: {
            a: 1,
            subchild1: { liveblocksType: "LiveObject", data: { b: 2 } },
            subchild2: { liveblocksType: "LiveObject", data: { c: 2 } },
          },
        },
        child2: { liveblocksType: "LiveObject", data: { a: 1 } },
      },
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    convertedNodes.delete("root");
    expect(convertedNodes).toEqual(new Map<string, SerializedCrdt>(nodes));
  });

  test("LiveMaps With LiveObjects", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "map1", type: CrdtType.MAP }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: "first", type: CrdtType.OBJECT }],
      ["si:3", { data: { a: 1 }, parentId: "si:1", parentKey: "second", type: CrdtType.OBJECT }],
      ["si:4", { data: { a: 2 }, parentId: "si:1", parentKey: "third", type: CrdtType.OBJECT }],
    ];

    const plainLson = snapshotToPlainLson(makeSnapshot(nodes));
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {
        map1: {
          liveblocksType: "LiveMap",
          data: {
            first: { liveblocksType: "LiveObject", data: { a: 0 } },
            second: { liveblocksType: "LiveObject", data: { a: 1 } },
            third: { liveblocksType: "LiveObject", data: { a: 2 } },
          },
        },
      },
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    convertedNodes.delete("root");
    expect(convertedNodes).toEqual(new Map<string, SerializedCrdt>(nodes));
  });

  test("LiveList with LiveObjects", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list1", type: CrdtType.LIST }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: FIRST_POSITION, type: CrdtType.OBJECT }],
      ["si:3", { data: { a: 1 }, parentId: "si:1", parentKey: SECOND_POSITION, type: CrdtType.OBJECT }],
      ["si:4", { data: { a: 3 }, parentId: "si:3", parentKey: "subSecond", type: CrdtType.OBJECT }],
    ];

    const plainLson = snapshotToPlainLson(makeSnapshot(nodes));
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {
        list1: {
          liveblocksType: "LiveList",
          data: [
            { liveblocksType: "LiveObject", data: { a: 0 } },
            {
              liveblocksType: "LiveObject",
              data: {
                a: 1,
                subSecond: {
                  liveblocksType: "LiveObject",
                  data: { a: 3 },
                },
              },
            },
          ],
        },
      },
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    convertedNodes.delete("root");
    expect(convertedNodes).toEqual(new Map<string, SerializedCrdt>(nodes));
  });

  test("LiveList with LiveRegisters", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list1", type: CrdtType.LIST }],
      ["si:2", { data: 0, parentId: "si:1", parentKey: FIRST_POSITION, type: CrdtType.REGISTER }],
      ["si:3", { data: 1, parentId: "si:1", parentKey: SECOND_POSITION, type: CrdtType.REGISTER }],
    ];

    const plainLson = snapshotToPlainLson(makeSnapshot(nodes));
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {
        list1: {
          liveblocksType: "LiveList",
          data: [0, 1],
        },
      },
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    convertedNodes.delete("root");
    expect(convertedNodes).toEqual(new Map<string, SerializedCrdt>(nodes));
  });

  test("Empty LiveList and LiveMap and LiveObject", () => {
    // prettier-ignore
    // NOTE: Nodes will come out in alphabetical parentKey order, so list < map < obj
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list", type: CrdtType.LIST }],
      ["si:2", { parentId: "root", parentKey: "map", type: CrdtType.MAP }],
      ["si:3", { data: {}, parentId: "root", parentKey: "obj", type: CrdtType.OBJECT }],
    ];

    const plainLson = snapshotToPlainLson(makeSnapshot(nodes));
    expect(plainLson).toEqual({
      liveblocksType: "LiveObject",
      data: {
        list: { liveblocksType: "LiveList", data: [] },
        obj: { liveblocksType: "LiveObject", data: {} },
        map: { liveblocksType: "LiveMap", data: {} },
      },
    });

    const convertedNodes = plainLsonToNodeMap(plainLson);
    convertedNodes.delete("root");
    expect(convertedNodes).toEqual(new Map<string, SerializedCrdt>(nodes));
  });
});

describe("Deserialization of nodes (from PlainLson format)", () => {
  test("Embedded value on root should not be ignored", () => {
    const tree: PlainLsonObject = {
      liveblocksType: "LiveObject",
      data: {
        embeddedValue: { a: 1 },
        child: {
          liveblocksType: "LiveObject",
          data: { foo: 1 },
        },
      },
    };

    const convertedNodes = plainLsonToNodeMap(tree);

    expect(convertedNodes).toEqual(
      new Map([
        [
          "root",
          {
            data: { embeddedValue: { a: 1 } },
            type: 0,
          },
        ],
        [
          "si:1",
          {
            data: { foo: 1 },
            type: 0,
            parentId: "root",
            parentKey: "child",
          },
        ],
      ])
    );
  });

  test("Object/List/Map with null value", () => {
    const tree = {
      liveblocksType: "LiveObject",
      data: {
        child: {
          liveblocksType: "LiveObject",
          data: { a: null },
        },
        list: {
          liveblocksType: "LiveList",
          data: [null],
        },
        map: {
          liveblocksType: "LiveMap",
          data: {
            a: null,
          },
        },
      },
    };

    const convertedNodes = plainLsonToNodeMap(tree as PlainLsonObject);

    expect(convertedNodes).toEqual(
      new Map([
        [
          "root",
          {
            data: {},
            type: 0,
          },
        ],
        [
          "si:1",
          {
            data: { a: null },
            type: 0,
            parentId: "root",
            parentKey: "child",
          },
        ],
        [
          "si:2",
          {
            type: 1,
            parentId: "root",
            parentKey: "list",
          },
        ],
        [
          "si:3",
          {
            data: null,
            type: 3,
            parentId: "si:2",
            parentKey: "!",
          },
        ],
        [
          "si:4",
          {
            type: 2,
            parentId: "root",
            parentKey: "map",
          },
        ],
        [
          "si:5",
          {
            data: null,
            type: 3,
            parentId: "si:4",
            parentKey: "a",
          },
        ],
      ])
    );
  });

  test("Invalid liveblocksType should throw error", () => {
    const tree = {
      liveblocksType: "LiveObject",
      data: {
        child: {
          liveblocksType: "InvalidType",
          data: 1,
        },
      },
    };

    expect(() => plainLsonToNodeMap(tree as PlainLsonObject)).toThrow();
  });
});

describe("streaming === nonstreaming equivalence", () => {
  function streamingResult(nodes: StorageNode[]): string {
    return consume(snapshotToPlainLson_lazy(makeSnapshot(nodes)));
  }

  function nonstreamingResult(nodes: StorageNode[]): string {
    return JSON.stringify(snapshotToPlainLson_eager(makeSnapshot(nodes)));
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
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list1", type: CrdtType.LIST }],
      ["si:2", { data: { a: 0 }, parentId: "si:1", parentKey: FIRST_POSITION, type: CrdtType.OBJECT }],
      ["si:3", { data: 1, parentId: "si:1", parentKey: SECOND_POSITION, type: CrdtType.REGISTER }],
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
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { data: { x: 1 }, parentId: "root", parentKey: "level1", type: CrdtType.OBJECT }],
      ["si:2", { parentId: "si:1", parentKey: "items", type: CrdtType.LIST }],
      ["si:3", { data: { y: 2 }, parentId: "si:2", parentKey: FIRST_POSITION, type: CrdtType.OBJECT }],
      ["si:4", { parentId: "si:3", parentKey: "lookup", type: CrdtType.MAP }],
      ["si:5", { data: { z: 3 }, parentId: "si:4", parentKey: "entry", type: CrdtType.OBJECT }],
    ];
    expect(streamingResult(nodes)).toBe(nonstreamingResult(nodes));
  });

  test("LiveList with register values of various types", () => {
    // prettier-ignore
    const nodes: StorageNode[] = [
      ["si:1", { parentId: "root", parentKey: "list", type: CrdtType.LIST }],
      ["si:2", { data: "string", parentId: "si:1", parentKey: FIRST_POSITION, type: CrdtType.REGISTER }],
      ["si:3", { data: 42, parentId: "si:1", parentKey: SECOND_POSITION, type: CrdtType.REGISTER }],
      ["si:4", { data: null, parentId: "si:1", parentKey: makePosition(SECOND_POSITION), type: CrdtType.REGISTER }],
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

describe("iterPlainLson", () => {
  test("always emits parent nodes before their children", () => {
    // Create a deeply nested structure to test ordering
    const tree: PlainLsonObject = {
      liveblocksType: "LiveObject",
      data: {
        level1Object: {
          liveblocksType: "LiveObject",
          data: {
            level2Object: {
              liveblocksType: "LiveObject",
              data: { value: 1 },
            },
          },
        },
        level1List: {
          liveblocksType: "LiveList",
          data: [
            {
              liveblocksType: "LiveObject",
              data: {
                nested: {
                  liveblocksType: "LiveMap",
                  data: {
                    key: { liveblocksType: "LiveObject", data: { x: 1 } },
                  },
                },
              },
            },
          ],
        },
        level1Map: {
          liveblocksType: "LiveMap",
          data: {
            entry: {
              liveblocksType: "LiveList",
              data: [1, 2, 3],
            },
          },
        },
      },
    };

    // Collect all emitted nodes and track which IDs we've seen
    const emittedIds = new Set<string>();

    for (const node of plainLsonToNodeStream(tree)) {
      // For non-root nodes, verify the parent was already emitted
      if (!isRootStorageNode(node)) {
        const crdt = node[1];
        const parentId = crdt.parentId;
        expect(emittedIds.has(parentId)).toBe(true);
      }

      // Mark this node as emitted (for both root and non-root nodes)
      const id = node[0];
      emittedIds.add(id);
    }

    // Verify we actually tested something meaningful
    expect(emittedIds.size).toBeGreaterThan(5);
  });

  test("is lazy - does not build intermediate Maps", () => {
    const tree: PlainLsonObject = {
      liveblocksType: "LiveObject",
      data: {
        child: {
          liveblocksType: "LiveObject",
          data: { value: 1 },
        },
      },
    };

    const iterator = plainLsonToNodeStream(tree);

    // Get first value
    const first = iterator.next();
    expect(first.done).toBe(false);
    expect(first.value![0]).toBe("root");

    // Get second value
    const second = iterator.next();
    expect(second.done).toBe(false);
    expect(second.value![0]).toBe("si:1");

    // Verify iteration completes
    const third = iterator.next();
    expect(third.done).toBe(true);
  });
});
