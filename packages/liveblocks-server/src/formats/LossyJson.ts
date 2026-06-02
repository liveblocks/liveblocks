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

import type { Json, JsonObject } from "@liveblocks/core";
import { CrdtType } from "@liveblocks/core";

import type { IReadableSnapshot } from "~/interfaces";

// ---------------------------------------------------------------------------
// Non-streaming version
// ---------------------------------------------------------------------------

/**
 * Serialize a storage snapshot to a simple JSON representation, returning a
 * full in-memory JsonObject. Faster than snapshotToLossyJson_lazy for
 * small/medium documents because the result can be passed straight to
 * JSON.stringify(). This format is lossy — the original storage structure
 * cannot be reconstructed from it, so it's output-only.
 */
export function snapshotToLossyJson_eager(
  snapshot: IReadableSnapshot
): JsonObject {
  try {
    return buildObject(snapshot, "root", snapshot.get_root().data);
  } finally {
    snapshot.destroy();
  }
}

function buildNode(snapshot: IReadableSnapshot, id: string): Json {
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
): JsonObject {
  const data = Object.assign(Object.create(null), staticData) as JsonObject;
  for (const [key, childId] of snapshot.iter_children(id)) {
    data[key] = buildNode(snapshot, childId);
  }
  return data;
}

function buildList(snapshot: IReadableSnapshot, id: string): Json[] {
  const data: Json[] = [];
  for (const [_, childId] of snapshot.iter_children(id)) {
    data.push(buildNode(snapshot, childId));
  }
  return data;
}

function buildMap(snapshot: IReadableSnapshot, id: string): JsonObject {
  const data = Object.create(null) as JsonObject;
  for (const [key, childId] of snapshot.iter_children(id)) {
    data[key] = buildNode(snapshot, childId);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Streaming version
// ---------------------------------------------------------------------------

// Generator-of-strings type alias for brevity of signatures
type StringGen = Generator<string, void, never>;

/**
 * Serialize a storage snapshot to a simple JSON representation. This format is
 * easy to consume but lossy — the original storage structure cannot be
 * reconstructed from it, so it's an output-only format. Slower than
 * snapshotToLossyJson_eager but can stream documents that don't fit entirely
 * in memory.
 *
 * This generator yields text chunks that together, when concatenated, form the
 * output JSON document.
 */
export function* snapshotToLossyJson_lazy(
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

  yield "{";
  yield staticJson;

  for (const [key, childId] of snapshot.iter_children(id)) {
    if (comma) yield ",";
    else comma = true;

    yield `${JSON.stringify(key)}:`;
    yield* emit(snapshot, childId);
  }
  yield "}";
}

function* emitList(snapshot: IReadableSnapshot, id: string): StringGen {
  let comma = false;

  yield "[";
  for (const [_, childId] of snapshot.iter_children(id)) {
    if (comma) yield ",";
    else comma = true;
    yield* emit(snapshot, childId);
  }
  yield "]";
}

function* emitMap(snapshot: IReadableSnapshot, id: string): StringGen {
  let comma = false;

  yield "{";
  for (const [key, childId] of snapshot.iter_children(id)) {
    if (comma) yield ",";
    else comma = true;

    yield `${JSON.stringify(key)}:`;
    yield* emit(snapshot, childId);
  }
  yield "}";
}
