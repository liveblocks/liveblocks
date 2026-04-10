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
  JsonObject,
  ObjectStorageNode,
  PlainLson,
  PlainLsonFields,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
  RootStorageNode,
  SerializedList,
  StorageNode,
} from "@liveblocks/core";
import {
  assertNever,
  CrdtType,
  isJsonObject,
  makePosition,
} from "@liveblocks/core";

import type { IReadableSnapshot } from "~/interfaces";

const SERVER_INIT_OP_PREFIX = "si";

function generateId(state: { clock: number }) {
  return `${SERVER_INIT_OP_PREFIX}:${state.clock++}`;
}

function isSpecialPlainLsonValue(
  value: PlainLson
): value is PlainLsonObject | PlainLsonMap | PlainLsonList {
  return isJsonObject(value) && value.liveblocksType !== undefined;
}

/**
 * Generator that yields NodeTuples for a JSON value.
 * Always yields parent nodes before their children.
 */
function* iterJson(
  key: string,
  data: PlainLson,
  parent: StorageNode,
  state: { clock: number }
): Generator<StorageNode, void, undefined> {
  if (isSpecialPlainLsonValue(data)) {
    switch (data.liveblocksType) {
      case "LiveObject":
        yield* iterObjectInner(key, data.data, parent, state);
        return;

      case "LiveList":
        yield* iterList(key, data.data, parent, state);
        return;

      case "LiveMap":
        yield* iterMap(key, data.data, parent, state);
        return;

      // istanbul ignore next
      default:
        assertNever(data, "Unknown `liveblocksType` field");
    }
  } else {
    yield [
      generateId(state),
      {
        type: CrdtType.REGISTER,
        data,
        parentId: parent[0],
        parentKey: key,
      },
    ];
  }
}

/**
 * Generator that yields NodeTuples for a LiveMap.
 * Yields the map node first, then its children.
 */
function* iterMap(
  key: string,
  map: PlainLsonFields,
  parent: StorageNode,
  state: { clock: number }
): Generator<StorageNode, void, undefined> {
  const mapTuple: StorageNode = [
    generateId(state),
    { type: CrdtType.MAP, parentId: parent[0], parentKey: key },
  ];

  // Yield the map node first (parent before children)
  yield mapTuple;

  // Then yield all children
  for (const [subKey, subValue] of Object.entries(map)) {
    yield* iterJson(subKey, subValue, mapTuple, state);
  }
}

/**
 * Generator that yields NodeTuples for a LiveList.
 * Yields the list node first, then its children.
 */
function* iterList(
  key: string,
  list: PlainLson[],
  parent: StorageNode,
  state: { clock: number }
): Generator<StorageNode, void, undefined> {
  const id = generateId(state);
  const crdt: SerializedList = {
    type: CrdtType.LIST,
    parentId: parent[0],
    parentKey: key,
  };
  const listTuple: StorageNode = [id, crdt];

  // Yield the list node first (parent before children)
  yield listTuple;

  // Then yield all children
  let position = makePosition();
  for (const subValue of list) {
    yield* iterJson(position, subValue, listTuple, state);
    position = makePosition(position);
  }
}

/**
 * Generator that yields NodeTuples for a LiveObject.
 * Yields the object node first, then its children.
 *
 * Note: The object's data field is populated with non-special values
 * (primitives, arrays, plain objects), while special values (LiveObject,
 * LiveList, LiveMap) are yielded as separate nodes.
 */
function* iterObjectInner(
  key: string,
  value: PlainLsonFields,
  parent: StorageNode | null,
  state: { clock: number }
): Generator<StorageNode, void, undefined> {
  // First pass: collect non-special data and identify special children
  const data: JsonObject = {};
  const specialChildren: Array<[string, PlainLson]> = [];

  for (const [subKey, subValue] of Object.entries(value)) {
    if (isSpecialPlainLsonValue(subValue)) {
      specialChildren.push([subKey, subValue]);
    } else {
      data[subKey] = subValue;
    }
  }

  // Create the object tuple with collected data
  const objectTuple: RootStorageNode | ObjectStorageNode =
    parent !== null
      ? [
          generateId(state),
          {
            type: CrdtType.OBJECT,
            data,
            parentId: parent[0],
            parentKey: key,
          },
        ]
      : ["root", { type: CrdtType.OBJECT, data }];

  // Yield the object node first (parent before children)
  yield objectTuple;

  // Then yield all special children
  for (const [subKey, subValue] of specialChildren) {
    yield* iterJson(subKey, subValue, objectTuple, state);
  }
}

/**
 * Transform a "Plain LSON" document to a lazy NodeStream. Used to initialize
 * the storage with a predefined state.
 * Always emits parent nodes before their children.
 */
export function* plainLsonToNodeStream(
  root: PlainLsonObject
): Generator<StorageNode, void, undefined> {
  const state = { clock: 1 };
  yield* iterObjectInner("root", root.data, null, state);
}

// ---------------------------------------------------------------------------
// Non-streaming serialization: builds a full PlainLsonObject in memory.
// ---------------------------------------------------------------------------

/**
 * Serialize a storage snapshot to "Plain LSON" format, returning a full
 * in-memory PlainLsonObject. Faster than snapshotToPlainLson_lazy for
 * small/medium documents because the result can be passed straight to
 * JSON.stringify().
 */
export function snapshotToPlainLson_eager(
  snapshot: IReadableSnapshot
): PlainLsonObject {
  try {
    return buildObject(snapshot, "root", snapshot.get_root().data);
  } finally {
    snapshot.destroy();
  }
}

function buildNode(snapshot: IReadableSnapshot, id: string): PlainLson {
  const node = snapshot.get_node(id);
  if (node.type === CrdtType.OBJECT) {
    return buildObject(snapshot, id, node.data);
  } else if (node.type === CrdtType.LIST) {
    return buildList(snapshot, id);
  } else if (node.type === CrdtType.MAP) {
    return buildMap(snapshot, id);
  } else {
    return node.data;
  }
}

function buildObject(
  snapshot: IReadableSnapshot,
  id: string,
  staticData: JsonObject
): PlainLsonObject {
  // Static data values are Json, which is a subset of PlainLson
  const data: PlainLsonFields = Object.assign(
    Object.create(null),
    staticData
  ) as PlainLsonFields;
  for (const [key, childId] of snapshot.iter_children(id)) {
    data[key] = buildNode(snapshot, childId);
  }
  return { liveblocksType: "LiveObject", data };
}

function buildList(snapshot: IReadableSnapshot, id: string): PlainLsonList {
  const data: PlainLson[] = [];
  for (const [_, childId] of snapshot.iter_children(id)) {
    data.push(buildNode(snapshot, childId));
  }
  return { liveblocksType: "LiveList", data };
}

function buildMap(snapshot: IReadableSnapshot, id: string): PlainLsonMap {
  const data = Object.create(null) as PlainLsonFields;
  for (const [key, childId] of snapshot.iter_children(id)) {
    data[key] = buildNode(snapshot, childId);
  }
  return { liveblocksType: "LiveMap", data };
}

// ---------------------------------------------------------------------------
// Streaming serialization: yields string chunks that concatenate to JSON.
// ---------------------------------------------------------------------------

// Generator-of-strings type alias for brevity of signatures
type StringGen = Generator<string, void, never>;

/**
 * Serialize a storage snapshot to "Plain LSON" format. Yields string chunks
 * that, when concatenated, form a valid JSON string representing the storage
 * document. Slower than snapshotToPlainLson_eager but can stream documents
 * that don't fit entirely in memory.
 */
export function* snapshotToPlainLson_lazy(
  snapshot: IReadableSnapshot
): StringGen {
  try {
    const staticJson = JSON.stringify(snapshot.get_root().data).slice(1, -1);
    yield* emitObject(snapshot, "root", staticJson);
  } finally {
    snapshot.destroy();
  }
}

function* emit(snapshot: IReadableSnapshot, id: string): StringGen {
  const node = snapshot.get_node(id);
  if (node.type === CrdtType.OBJECT) {
    yield* emitObject(snapshot, id, JSON.stringify(node.data).slice(1, -1));
  } else if (node.type === CrdtType.LIST) {
    yield* emitList(snapshot, id);
  } else if (node.type === CrdtType.MAP) {
    yield* emitMap(snapshot, id);
  } else if (node.type === CrdtType.REGISTER) {
    yield JSON.stringify(node.data);
  }
}

/**
 * @param staticJson - The object's static (non-CRDT) properties as a raw JSON
 *   string without the surrounding braces, e.g. `"foo":1,"bar":"hi"`.
 *
 *   Children are emitted _after_ the static properties. If a child key
 *   collides with a static key (which shouldn't normally happen, but
 *   defensively), the child wins because JSON.parse keeps the last value
 *   for duplicate keys.
 */
function* emitObject(
  snapshot: IReadableSnapshot,
  id: string,
  staticJson: string
): StringGen {
  let comma = staticJson.length > 0;

  yield '{"liveblocksType":"LiveObject","data":{';
  yield staticJson;

  for (const [key, childId] of snapshot.iter_children(id)) {
    if (comma) yield ",";
    else comma = true;

    yield `${JSON.stringify(key)}:`;
    yield* emit(snapshot, childId);
  }
  yield "}}";
}

function* emitList(snapshot: IReadableSnapshot, id: string): StringGen {
  let comma = false;

  yield '{"liveblocksType":"LiveList","data":[';
  for (const [_, childId] of snapshot.iter_children(id)) {
    if (comma) yield ",";
    else comma = true;
    yield* emit(snapshot, childId);
  }
  yield "]}";
}

function* emitMap(snapshot: IReadableSnapshot, id: string): StringGen {
  let comma = false;

  yield '{"liveblocksType":"LiveMap","data":{';
  for (const [key, childId] of snapshot.iter_children(id)) {
    if (comma) yield ",";
    else comma = true;

    yield `${JSON.stringify(key)}:`;
    yield* emit(snapshot, childId);
  }
  yield "}}";
}
