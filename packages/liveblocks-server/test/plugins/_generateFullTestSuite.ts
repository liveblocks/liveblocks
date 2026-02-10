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

/**
 * ⚠️ It's important that we run the same test suite in all projects that
 * implement a concrete IStorageDriver driver.
 *
 * Therefore, always run `sync-test-suite.sh` after modifying this file!
 *
 * WHY?
 * The generateFullTestSuite function creates a full unit test suite for
 * testing _any_ concrete implementation of IStorageDriver. Functionally,
 * independent of what concrete implementation you use, the behavior should be
 * the same. Hence, the same suite of tests should apply.
 *
 * Places that need to stay in sync:
 * - In shared/liveblocks-server, to test the InMemoryDriver
 * - In tools/liveblocks-cli, to test the BunSQLiteDriver
 * - In apps/cloudflare, to test these implementations:
 *     - DurableObjectStorageBackend
 *     - DurableObjectSQLiteStorageBackend
 *     - GenericDurableObjectStorageBackend
 */
import type {
  Awaitable,
  ChildStorageNode,
  Json,
  JsonObject,
  ListStorageNode,
  MapStorageNode,
  NodeMap,
  NodeStream,
  ObjectStorageNode,
  PlainLson,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
  RegisterStorageNode,
  SerializedChild,
  SerializedCrdt,
  SerializedRegister,
  SerializedRootObject,
  StorageNode,
} from "@liveblocks/core";
import {
  CrdtType,
  isRootStorageNode,
  makePosition,
  nanoid,
  nn,
  OpCode,
  raise,
} from "@liveblocks/core";
import * as fc from "fast-check";
import { imap, uniqueEverseen } from "itertools";
import { Base64 } from "js-base64";
import { describe, expect, test } from "vitest";
import * as Y from "yjs";

import type { Guid, Pos } from "~";
import type { YDocId } from "~/decoders/y-types";
import type { IStorageDriver, IStorageDriverNodeAPI } from "~/interfaces";
import type { Logger } from "~/lib/Logger";
import { Logger as LoggerImpl, LogLevel, LogTarget } from "~/lib/Logger";
import { quote } from "~/lib/text";
import type {
  ClientWireOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateRegisterOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  HasOpId,
  SetParentKeyOp,
  UpdateObjectOp,
} from "~/protocol";
import { Storage } from "~/Storage";
import { YjsStorage } from "~/YjsStorage";

// Project-specific way to turn b64 string into Uint8Array
function b64ToBytes(base64: string): Uint8Array {
  return Base64.toUint8Array(base64);
}

// Project-specific way to turn Uint8Array into a b64 string
function bytesToB64(bytes: Uint8Array): string {
  return Base64.fromUint8Array(bytes);
}

// -----------------------------------------------------------------------------------
// AUTO-SYNC EVERYTHING BELOW THIS LINE
// -----------------------------------------------------------------------------------

/** Empty document for resetting storage in tests */
const EMPTY_DOC: PlainLsonObject = { liveblocksType: "LiveObject", data: {} };

function asPromise<R>(fn: () => Awaitable<R>): Promise<R> {
  return (async () => fn())();
}

/**
 * Expect-throw assertion that works with both sync and async functions.
 */
function expectToThrow(fn: () => Awaitable<unknown>, errorPattern: RegExp) {
  return expect(asPromise(() => fn())).rejects.toThrow(errorPattern);
}

// SYNC-SLOT: directives
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// SYNC-SLOT-END: directives

const KNOWN_DOC_KEYS = ["root", "0:do", "0:dl", "0:dm"];
const KNOWN_NON_OBJECT_KEYS = ["0:dl", "0:dm"];
const KNOWN_TOP_LEVEL_KEYS = ["l", "m", "o"];

/**
 * Returns true if the node would NOT overwrite the default document's top-level
 * nodes (0:dl, 0:dm, 0:do at keys l, m, o). We filter these out because other
 * generated nodes may reference those as parents.
 */
function wouldNotOverwriteDefaultDoc(n: {
  parentId: string;
  parentKey: string;
}) {
  return n.parentId !== "root" || !KNOWN_TOP_LEVEL_KEYS.includes(n.parentKey);
}

/**
 * Sets up the database with the following root document structure
 *
 *   LiveObject({           # root
 *     l: LiveList(),       # 0:dl
 *     m: LiveMap(),        # 0:dm
 *     o: LiveObject(),     # 0:do
 *   })
 *
 * This way, every test can assume that these "roots" objects
 * exist, in order to express tests more succinctly.
 */
async function withDefaultDocument(driver: IStorageDriver) {
  await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
  const db = await driver.load_nodes_api(blackHole);

  await write_nodes(db, [
    list("0:dl", "root", "l"),
    map("0:dm", "root", "m"),
    obj("0:do", {}, "root", "o"),
  ]);

  return db;
}

function assert(
  condition: boolean,
  message: string,
  ...args: unknown[]
): asserts condition {
  if (!condition) {
    throw new Error(
      [
        message,
        args
          .map((arg) => JSON.stringify(arg, null, 2))
          .filter((s) => s)
          .join("\n"),
      ]
        .filter((s) => s)
        .join("\n")
    );
  }
}

/**
 * Will do a thorough health check of a Storage instance's internal state
 * (in-memory and on-disk), and will throw if _anything_ is in an inconsistent
 * state.
 */
export async function selfCheck(storage: Storage): Promise<void> {
  const driver: IStorageDriverNodeAPI = storage.loadedDriver;

  {
    // Check in-memory node tree integrity
    const inMemoryNodes = new Map<string, SerializedCrdt>(driver.iter_nodes());
    assert(inMemoryNodes.size > 0, "Expected at least 1 node");

    const root = inMemoryNodes.get("root");
    assert(root !== undefined, 'Expected to have a "root" node');

    // Check each node
    for (const [id, node] of inMemoryNodes) {
      if (id === "root") {
        assert(node.parentId === undefined, "Root node must have no parent ID", id, node); // prettier-ignore

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        assert(node.parentKey === undefined, "Root node must have no parent key", id, node); // prettier-ignore
      } else {
        assert(node.parentId !== undefined, `Node ${quote(id)} is missing parent ID`); // prettier-ignore
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        assert(node.parentKey !== undefined, `Node ${quote(id)} is missing parent key`); // prettier-ignore

        const parentId = nn(node.parentId);
        const parentKey = nn(node.parentKey);

        assert(driver.get_node(parentId) !== undefined, `Node ${quote(id)} points to ${quote(parentId)}, but no such node exists`); // prettier-ignore
        assert(driver.get_node(parentId)?.type !== CrdtType.REGISTER, `Node ${quote(parentId)} has children (e.g. ${quote(id)}), but is a register node`); // prettier-ignore

        assert(node.type !== CrdtType.REGISTER || driver.get_node(parentId)?.type !== CrdtType.OBJECT, `Node ${quote(id)} is a REGISTER with value ${JSON.stringify((node as SerializedRegister).data)}, but appears as a child under OBJECT node ${quote(parentId)}. Would have expected OBJECT to have this value as a static data attribute under key ${quote(parentKey)}.`); // prettier-ignore

        // Following a node's parents ends in the root node
        const seen = new Set<string>();
        seen.add(id);
        let curr: SerializedCrdt = node;
        while (curr.parentId !== undefined) {
          assert(!seen.has(curr.parentId), `Ref cycle found in node ${quote(id)}`, Array.from(seen)); // prettier-ignore
          seen.add(curr.parentId);

          const next = driver.get_node(curr.parentId);
          assert(
            next !== undefined,
            `Node ${JSON.stringify(curr)} is an orphan`
          );
          curr = nn(next);
        }
        expect(curr, `Walking up from node ${quote(id)} did not reach root`).toEqual(root); // prettier-ignore
      }
    }

    // There exist no duplicate node instances (every value in this map is a unique value)
    const instances = new Set<SerializedCrdt>();
    for (const [id, instance] of inMemoryNodes) {
      assert(
        !instances.has(instance),
        `Node instance under key ${quote(id)} already exists under another key. Each key in the node map must have a unique value.`
      );
      instances.add(instance);
    }
  }

  {
    // Loading the persisted data back in from storage now, it should match
    // whatever we still have in memory (ignoring the metadata and usage
    // metrics keys)
    const onDiskNodes = new Map(await storage.raw_iter_nodes());
    for (const [id, inMemoryNode] of driver.iter_nodes()) {
      if (inMemoryNode.parentId === undefined) {
        // This is the root node, which needs special treatment. Root nodes are
        // not always written to storage. In that case, it's a virtual root.
        // But even a virtual root on disk should still equal the actual root
        // node in-memory!
        const onDiskRootNode = onDiskNodes.get(id) ?? {
          type: CrdtType.OBJECT,
          data: {},
        };
        assert(JSON.stringify(inMemoryNode) === JSON.stringify(onDiskRootNode), `Root node ${quote(id)} in memory and on disk aren't equal`, inMemoryNode, onDiskNodes.get(id) ?? "<virtual root>"); // prettier-ignore
      } else {
        assert(onDiskNodes.has(id), `Node ${quote(id)} is in memory, but is not persisted in durable object storage`); // prettier-ignore
        const onDiskNode = onDiskNodes.get(id);
        assert(JSON.stringify(inMemoryNode) === JSON.stringify(onDiskNode), `Node ${quote(id)} in memory and on disk aren't equal`, inMemoryNode, onDiskNode); // prettier-ignore
      }
    }
  }
}

// An infinite stream that always yields T and never returns
type InfiniteStream<T> = Omit<IterableIterator<T>, "next"> & {
  next(): { value: T; done?: false };
};

// Check if a PlainLson value is a container (LiveObject/LiveList/LiveMap)
function isPlainLsonContainer(
  value: PlainLson
): value is PlainLsonObject | PlainLsonList | PlainLsonMap {
  return (
    typeof value === "object" &&
    value !== null &&
    "liveblocksType" in value &&
    (value.liveblocksType === "LiveObject" ||
      value.liveblocksType === "LiveList" ||
      value.liveblocksType === "LiveMap")
  );
}

// Convert a PlainLsonObject tree to a NodeMap
function plainLsonTreeToNodeMap(
  plainLsonTree: PlainLsonObject,
  uniqNodeIds: InfiniteStream<string>,
  positions: InfiniteStream<Pos>
): NodeMap {
  const result: StorageNode[] = [];

  // Convert PlainLson tree to NodeMap recursively
  function recurse(
    plainLson: PlainLson,
    parentId: string,
    parentKey: string
  ): void {
    if (!isPlainLsonContainer(plainLson)) {
      // It's a Json leaf - create a REGISTER
      const id = uniqNodeIds.next().value;
      result.push([
        id,
        { type: CrdtType.REGISTER, parentId, parentKey, data: plainLson },
      ]);
      return;
    }

    const id = uniqNodeIds.next().value;

    if (plainLson.liveblocksType === "LiveObject") {
      const localData: JsonObject = {};
      const childEntries: [string, PlainLson][] = [];

      // Separate local JSON data from nested LSON children
      for (const [key, value] of Object.entries(plainLson.data)) {
        if (isPlainLsonContainer(value)) {
          childEntries.push([key, value]);
        } else {
          localData[key] = value;
        }
      }

      result.push([
        id,
        { type: CrdtType.OBJECT, parentId, parentKey, data: localData },
      ]);

      // Process nested children
      for (const [key, child] of childEntries) {
        recurse(child, id, key);
      }
    } else if (plainLson.liveblocksType === "LiveList") {
      result.push([id, { type: CrdtType.LIST, parentId, parentKey }]);

      // Process list items with unique position keys
      const uniqPositions: InfiniteStream<Pos> = uniqueEverseen(
        positions
      ) as InfiniteStream<Pos>;
      plainLson.data.forEach((child) => {
        recurse(child, id, uniqPositions.next().value);
      });
      // eslint-disable-next-line
    } else if (plainLson.liveblocksType === "LiveMap") {
      result.push([id, { type: CrdtType.MAP, parentId, parentKey }]);

      // Process map entries
      for (const [key, child] of Object.entries(plainLson.data)) {
        recurse(child, id, key);
      }
    }
  }

  // Process the root object specially (no parentId/parentKey)
  const rootData: JsonObject = {};
  const rootChildren: [string, PlainLson][] = [];

  for (const [key, value] of Object.entries(plainLsonTree.data)) {
    if (isPlainLsonContainer(value)) {
      rootChildren.push([key, value]);
    } else {
      rootData[key] = value;
    }
  }

  result.push(["root", { type: CrdtType.OBJECT, data: rootData }]);
  for (const [key, child] of rootChildren) {
    recurse(child, "root", key);
  }

  return new Map<string, SerializedCrdt>(result);
}

const FIRST_POSITION = makePosition();
const SECOND_POSITION = makePosition(FIRST_POSITION);
const THIRD_POSITION = makePosition(SECOND_POSITION);

function rootObj(data: JsonObject = {}): ["root", SerializedRootObject] {
  return ["root", { type: CrdtType.OBJECT, data }];
}

function obj(
  id: string,
  data: JsonObject,
  parentId: string,
  parentKey: string
): ObjectStorageNode {
  return [id, { type: CrdtType.OBJECT, data, parentId, parentKey }];
}

export function list(
  id: string,
  parentId: string,
  parentKey: string
): ListStorageNode {
  return [id, { type: CrdtType.LIST, parentId, parentKey }];
}

export function map(
  id: string,
  parentId: string,
  parentKey: string
): MapStorageNode {
  return [id, { type: CrdtType.MAP, parentId, parentKey }];
}

export function register(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json
): RegisterStorageNode {
  return [id, { type: CrdtType.REGISTER, parentId, parentKey, data }];
}

export function updateObjectOp(
  id: string,
  data: Partial<JsonObject>,
  opId = nanoid()
): UpdateObjectOp & HasOpId {
  return { opId, id, type: OpCode.UPDATE_OBJECT, data };
}

export function createObjectOp(
  id: string,
  parentId: string,
  parentKey: string,
  data: Partial<JsonObject>,
  intent?: "set",
  deletedId?: string,
  opId = nanoid()
): CreateObjectOp & HasOpId {
  return {
    opId,
    id,
    type: OpCode.CREATE_OBJECT,
    parentId,
    parentKey,
    data,
    intent,
    deletedId,
  };
}

export function createListOp(
  id: string,
  parentId: string,
  parentKey: string,
  intent?: "set",
  deletedId?: string,
  opId = nanoid()
): CreateListOp & HasOpId {
  return {
    opId,
    id,
    type: OpCode.CREATE_LIST,
    parentId,
    parentKey,
    intent,
    deletedId,
  };
}

export function createRegisterOp(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json,
  intent?: "set",
  deletedId?: string,
  opId = nanoid()
): CreateRegisterOp & HasOpId {
  return {
    opId,
    id,
    type: OpCode.CREATE_REGISTER,
    parentId,
    parentKey,
    data,
    intent,
    deletedId,
  };
}

export function createMapOp(
  id: string,
  parentId: string,
  parentKey: string,
  intent?: "set",
  deletedId?: string,
  opId = nanoid()
): CreateMapOp & HasOpId {
  return {
    opId,
    id,
    type: OpCode.CREATE_MAP,
    parentId,
    parentKey,
    intent,
    deletedId,
  };
}

export function deleteCrdtOp(
  id: string,
  opId = nanoid()
): DeleteCrdtOp & HasOpId {
  return { opId, id, type: OpCode.DELETE_CRDT };
}

export function setParentKeyOp(
  id: string,
  parentKey: string,
  opId = nanoid()
): SetParentKeyOp & HasOpId {
  return { opId, id, type: OpCode.SET_PARENT_KEY, parentKey };
}

export function deleteObjectKeyOp(
  id: string,
  key: string,
  opId = nanoid()
): DeleteObjectKeyOp & HasOpId {
  return { opId, id, type: OpCode.DELETE_OBJECT_KEY, key };
}

function getSampleYDocUpdate(isV2: boolean = false) {
  const doc = new Y.Doc();
  const ytext = doc.getText("somedoc");
  ytext.insert(0, "abc");
  ytext.format(1, 2, { bold: true });
  const encode = isV2 ? Y.encodeStateAsUpdateV2 : Y.encodeStateAsUpdate;
  return encode(doc);
}

export function generateArbitraries(config?: {
  nodeKey?: () => fc.Arbitrary<string>;
  metaKey?: () => fc.Arbitrary<string>;
}) {
  const arb = {
    docId: () =>
      fc.oneof(
        { withCrossShrink: true },
        fc.constant("root" as const),
        fc.uuid().map((s) => s as Guid)
      ),

    key: () =>
      // Basically just fc.string(), but will shrink to more readable default value
      // (useful when the real error is elsewhere)
      fc.oneof(
        { withCrossShrink: true },
        fc.constant("key"),
        fc.constant("root"), // Make problems more likely
        fc.stringMatching(/^[0-9A-Za-z_-]+$/)
      ),

    nodeKey: () => config?.nodeKey?.() ?? arb.key(),
    metaKey: () => config?.metaKey?.() ?? arb.key(),

    jsonObject: () =>
      arb
        .json()
        .filter(
          (v): v is JsonObject =>
            v !== null && typeof v === "object" && !Array.isArray(v)
        ),

    json: () =>
      fc.oneof(
        { withCrossShrink: true },
        fc.constant("hi"),
        fc
          .jsonValue({ depthSize: "xsmall" })
          .filter((v) => {
            const jsonText = JSON.stringify(v);
            return (
              // Avoid generating floating point numbers in scientific notation
              // (like 1.2e-237), as they can round differently between Node and
              // SQLite. This is making isEqual comparisons annoying.
              !/\d+([.]\d{1,})?e[-+]\d{2,}/.test(jsonText) &&
              //
              // Also avoid generating objects with "__proto__" keys because those
              // don't survive a serialization/deserialization roundtrip in
              // DOS-KV storage. While is is typically a good thing in
              // production, it means that we cannot express that "what goes in
              // comes out" if inputs are generated this way.
              !/"__proto__"/.test(jsonText)
            );
          })
          .map(
            (v) =>
              // We do this stupid conversion to ensure all -0 values are rewritten as 0 :(
              JSON.parse(JSON.stringify(v)) as fc.JsonValue
          )
      ),

    rootNodeTuple: () =>
      fc.tuple<["root", SerializedRootObject]>(
        fc.constant("root"),
        arb.serializedRoot()
      ),
    childNodeTuple: () => {
      return fc
        .tuple(
          arb.nodeKey().filter((k) => !KNOWN_DOC_KEYS.includes(k)),
          arb.serializedChild()
        )
        .map((x) => x as ChildStorageNode);
    },

    metaEntries: () => fc.array(arb.metaPair()),

    serializedRoot: () =>
      fc.record<SerializedRootObject>({
        type: fc.constant(CrdtType.OBJECT),
        data: arb.jsonObject(),
      }),

    // Generates any valid serialized CRDT
    serializedChild: (): fc.Arbitrary<SerializedChild> => {
      const parentId = fc.constantFrom(...KNOWN_DOC_KEYS);
      const nonObjectParentId = fc.constantFrom(...KNOWN_NON_OBJECT_KEYS);
      return fc
        .oneof(
          fc.record<SerializedChild>({
            type: fc.constant(CrdtType.OBJECT),
            data: arb.jsonObject(),
            parentId,
            parentKey: arb.nodeKey(),
          }),
          fc.record<SerializedChild>({
            type: fc.constant(CrdtType.LIST),
            parentId,
            parentKey: arb.nodeKey(),
          }),
          fc.record<SerializedChild>({
            type: fc.constant(CrdtType.MAP),
            parentId,
            parentKey: arb.nodeKey(),
          }),
          fc.record<SerializedChild>({
            type: fc.constant(CrdtType.REGISTER),
            data: arb.json(),
            parentId: nonObjectParentId,
            parentKey: arb.nodeKey(),
          })
        )
        .filter(wouldNotOverwriteDefaultDoc);
    },

    metaPair: () => fc.tuple(arb.metaKey(), arb.json()),

    // -------------------------------------------------------------------------
    // Storage-specific arbitraries (ported from test/storage/arbitraries.ts)
    // -------------------------------------------------------------------------

    parentKey: () => {
      // prettier-ignore
      const COMMON_PARENT_KEYS = [
        "a", "b", "c", "cx", "cy", "data", "height", "items", "type", "width", "x",
        "y", "z",
      ];
      return fc.oneof(
        fc.constantFrom(...COMMON_PARENT_KEYS),
        fc.string(
          // The empty string will cause an infinite loop somewhere. Seems not worth
          // looking into, because this will be fixed by the Pos refactoring, see
          // also https://github.com/liveblocks/liveblocks/pull/565
          { minLength: 1 }
        )
      );
    },

    intent: () =>
      fc.oneof(
        { arbitrary: fc.constant(undefined), weight: 10 },
        fc.constant("set" as const)
      ),

    opId: () => fc.stringMatching(/^[0-9]+:[0-9]+$/),

    pos: (): fc.Arbitrary<Pos> => {
      function baseN(N: number): fc.Arbitrary<string> {
        return fc
          .integer({ min: 32, max: 32 + N - 1 })
          .map((n) => String.fromCharCode(n));
      }

      function base96Char(): fc.Arbitrary<string> {
        return fc.oneof(
          // Select 100 times more often from a "smaller" base10 alphabet. This is
          // done to increase changes of generating nodes with conflicts in them.
          { arbitrary: baseN(10), weight: 100 },
          { arbitrary: baseN(96), weight: 1 }
        );
      }

      return fc
        .string({ unit: base96Char() })
        .map(
          (p) => p.trimEnd() // Strip trailling "zeroes"
        )
        .filter((p) => p.length > 0)
        .map((p) => p as Pos);
    },

    infiniteStream: <T>(
      arb: fc.Arbitrary<T>
    ): fc.Arbitrary<InfiniteStream<T>> =>
      fc.infiniteStream(arb) as fc.Arbitrary<InfiniteStream<T>>,

    infiniteUniqueStream: <T>(
      arb: fc.Arbitrary<T>
    ): fc.Arbitrary<InfiniteStream<T>> =>
      fc
        .infiniteStream(arb)
        .map((stream) => uniqueEverseen(stream) as InfiniteStream<T>),

    /**
     * Generates a valid NodeMap from a PlainLsonObject tree. The generated
     * node maps are always structurally valid (no orphans, no cycles, no
     * conflicting siblings, etc).
     */
    nodeMap: (options?: {
      depthSize?: fc.DepthSize;
      maxDepth?: number;
      maxKeys?: number;
      maxLength?: number;
    }) => {
      return fc
        .tuple(
          arb.plainLsonTree(options),
          // Filter out "root" since that ID is reserved for the root node
          arb.infiniteUniqueStream(arb.nodeKey().filter((k) => k !== "root")),
          arb.infiniteStream(arb.pos())
        )
        .map(([plainLsonTree, uniqNodeIds, positions]) =>
          plainLsonTreeToNodeMap(plainLsonTree, uniqNodeIds, positions)
        );
    },

    /**
     * Generates a valid NodeMap from a PlainLsonObject tree. The generated
     * node maps are always structurally valid (no orphans, no cycles, no
     * conflicting siblings, etc).
     */
    nodeStream: (options?: {
      depthSize?: fc.DepthSize;
      maxDepth?: number;
      maxKeys?: number;
      maxLength?: number;
    }) => {
      return arb.nodeMap(options).map((x) => x as NodeStream);
    },

    plainLsonTree: (options?: {
      depthSize?: fc.DepthSize;
      maxDepth?: number;
      maxKeys?: number;
      maxLength?: number;
    }) => {
      const depthIdentifier = fc.createDepthIdentifier();
      const depthSize = options?.depthSize;
      const maxDepth = options?.maxDepth;
      return fc.letrec<{
        PlainLson: PlainLson;
        PlainLsonObject: PlainLsonObject;
        PlainLsonList: PlainLsonList;
        PlainLsonMap: PlainLsonMap;
        Json: Json;
      }>((tie) => ({
        PlainLson: fc.oneof(
          { arbitrary: tie("Json"),            weight: 1, depthIdentifier, maxDepth, depthSize }, // prettier-ignore
          { arbitrary: tie("PlainLsonObject"), weight: 2, depthIdentifier, maxDepth, depthSize }, // prettier-ignore
          { arbitrary: tie("PlainLsonMap"),    weight: 1, depthIdentifier, maxDepth, depthSize }, // prettier-ignore
          { arbitrary: tie("PlainLsonList"),   weight: 1, depthIdentifier, maxDepth, depthSize } // prettier-ignore
        ),
        PlainLsonObject: fc.record({
          liveblocksType: fc.constant("LiveObject" as const),
          data: fc.dictionary(fc.string(), tie("PlainLson"), { maxKeys: options?.maxKeys ?? 5 }), // prettier-ignore
        }),
        PlainLsonMap: fc.record({
          liveblocksType: fc.constant("LiveMap" as const),
          data: fc.dictionary(fc.string(), tie("PlainLson"), { maxKeys: options?.maxKeys ?? 5 }), // prettier-ignore
        }),
        PlainLsonList: fc.record({
          liveblocksType: fc.constant("LiveList" as const),
          data: fc.array(tie("PlainLson"), { maxLength: options?.maxLength ?? 5 }), // prettier-ignore
        }),
        Json: arb.json(),
      })).PlainLsonObject;
    },

    createObjectOp: (options?: {
      id?: fc.Arbitrary<string>;
      parentId?: fc.Arbitrary<string>;
      parentKey?: fc.Arbitrary<string>;
      data?: fc.Arbitrary<JsonObject>;
      intent?: fc.Arbitrary<"set" | undefined>;
      deletedId?: fc.Arbitrary<string | undefined>;
    }) =>
      fc.record<CreateObjectOp & HasOpId>({
        type: fc.constant(OpCode.CREATE_OBJECT),
        opId: arb.opId(),
        id: options?.id ?? arb.nodeKey(),
        parentId: options?.parentId ?? arb.nodeKey(),
        parentKey: options?.parentKey ?? arb.parentKey(),
        data: options?.data ?? arb.jsonObject(),
        intent: options?.intent ?? arb.intent(),
        deletedId:
          options?.deletedId ??
          fc.option(arb.nodeKey(), { freq: 10, nil: undefined }),
      }),

    createListOp: (options?: {
      id?: fc.Arbitrary<string>;
      parentId?: fc.Arbitrary<string>;
      parentKey?: fc.Arbitrary<string>;
      intent?: fc.Arbitrary<"set" | undefined>;
      deletedId?: fc.Arbitrary<string | undefined>;
    }) =>
      fc.record<CreateListOp & HasOpId>({
        type: fc.constant(OpCode.CREATE_LIST),
        opId: arb.opId(),
        id: options?.id ?? arb.nodeKey(),
        parentId: options?.parentId ?? arb.nodeKey(),
        parentKey: options?.parentKey ?? arb.parentKey(),
        intent: options?.intent ?? arb.intent(),
        deletedId:
          options?.deletedId ??
          fc.option(arb.nodeKey(), { freq: 10, nil: undefined }),
      }),

    createMapOp: (options?: {
      id?: fc.Arbitrary<string>;
      parentId?: fc.Arbitrary<string>;
      parentKey?: fc.Arbitrary<string>;
      intent?: fc.Arbitrary<"set" | undefined>;
      deletedId?: fc.Arbitrary<string | undefined>;
    }) =>
      fc.record<CreateMapOp & HasOpId>({
        type: fc.constant(OpCode.CREATE_MAP),
        opId: arb.opId(),
        id: options?.id ?? arb.nodeKey(),
        parentId: options?.parentId ?? arb.nodeKey(),
        parentKey: options?.parentKey ?? arb.parentKey(),
        intent: options?.intent ?? arb.intent(),
        deletedId:
          options?.deletedId ??
          fc.option(arb.nodeKey(), { freq: 10, nil: undefined }),
      }),

    createRegisterOp: (options?: {
      id?: fc.Arbitrary<string>;
      parentId?: fc.Arbitrary<string>;
      parentKey?: fc.Arbitrary<string>;
      data?: fc.Arbitrary<Json>;
      intent?: fc.Arbitrary<"set" | undefined>;
      deletedId?: fc.Arbitrary<string | undefined>;
    }) =>
      fc.record<CreateRegisterOp & HasOpId>({
        type: fc.constant(OpCode.CREATE_REGISTER),
        opId: arb.opId(),
        id: options?.id ?? arb.nodeKey(),
        parentId: options?.parentId ?? arb.nodeKey(),
        parentKey: options?.parentKey ?? arb.parentKey(),
        data: options?.data ?? arb.json(),
        intent: options?.intent ?? arb.intent(),
        deletedId:
          options?.deletedId ??
          fc.option(arb.nodeKey(), { freq: 10, nil: undefined }),
      }),

    createOp: (options?: {
      id?: fc.Arbitrary<string>;
      parentId?: fc.Arbitrary<string>;
      parentKey?: fc.Arbitrary<string>;
      intent?: fc.Arbitrary<"set" | undefined>;
      deletedId?: fc.Arbitrary<string | undefined>;
    }) =>
      fc.oneof(
        arb.createListOp(options),
        arb.createMapOp(options),
        arb.createObjectOp(options),
        arb.createRegisterOp(options)
      ),

    deleteCrdtOpArb: () =>
      fc.record<DeleteCrdtOp & HasOpId>({
        type: fc.constant(OpCode.DELETE_CRDT),
        opId: arb.opId(),
        id: arb.nodeKey(),
      }),

    updateObjectOpArb: () =>
      fc.record<UpdateObjectOp & HasOpId>({
        type: fc.constant(OpCode.UPDATE_OBJECT),
        opId: arb.opId(),
        id: arb.nodeKey(),
        data: arb.jsonObject(),
      }),

    setParentKeyOpArb: () =>
      fc.record<SetParentKeyOp & HasOpId>({
        type: fc.constant(OpCode.SET_PARENT_KEY),
        opId: arb.opId(),
        id: arb.nodeKey(),
        parentKey: arb.pos(),
      }),

    deleteObjectKeyOpArb: () =>
      fc.record<DeleteObjectKeyOp & HasOpId>({
        type: fc.constant(OpCode.DELETE_OBJECT_KEY),
        opId: arb.opId(),
        id: arb.nodeKey(),
        key: arb.parentKey(),
      }),

    clientWireOp: () =>
      fc.oneof(
        { arbitrary: arb.createOp(), weight: 40 },
        { arbitrary: arb.updateObjectOpArb(), weight: 40 },
        { arbitrary: arb.setParentKeyOpArb(), weight: 40 },
        { arbitrary: arb.deleteCrdtOpArb(), weight: 25 },
        { arbitrary: arb.deleteObjectKeyOpArb(), weight: 30 }
      ),
  };
  return arb;
}

function getAll(storage: Storage) {
  return Array.from(storage.loadedDriver.iter_nodes());
}

class VoidTarget extends LogTarget {
  constructor() {
    super((LogLevel.ERROR as number) + 1);
  }

  log(): void {
    /* Do nothing */
  }
}

function countChildrenOf(storage: Storage, parentId: string): number {
  let count = 0;
  for (const [, node] of storage.loadedDriver.iter_nodes()) {
    if (node.parentId === parentId) {
      count++;
    }
  }
  return count;
}

async function write_nodes(db: IStorageDriverNodeAPI, nodeStream: NodeStream) {
  for (const node of nodeStream) {
    if (isRootStorageNode(node)) {
      const crdt = node[1];
      await db.set_object_data("root", crdt.data, true);
    } else {
      const [id, crdt] = node;
      await db.set_child(id, crdt, true);
    }
  }
}

async function delete_nodes(db: IStorageDriverNodeAPI, ids: Iterable<string>) {
  for (const id of ids) {
    await db.delete_node(id);
  }
}

/** A black hole, where logs disappear beyond the event horizon */
const blackHole = new LoggerImpl(new VoidTarget());

type TestFn<TDriver> = (driver: TDriver) => Promise<void>;
type RunTestOptions = { initialNodes?: NodeMap };

export function generateFullTestSuite<TDriver extends IStorageDriver>(config: {
  name: string;
  /** Runs a test with a driver, optionally pre-populating raw storage data */
  runTest: (options: RunTestOptions, testFn: TestFn<TDriver>) => Promise<void>;
  customArbitraries?: {
    nodeKey?: () => fc.Arbitrary<string>;
    metaKey?: () => fc.Arbitrary<string>;
  };
}) {
  const arb = generateArbitraries({
    nodeKey: config.customArbitraries?.nodeKey,
    metaKey: config.customArbitraries?.metaKey,
  });

  // Wrapper that allows calling runTest with or without options
  function runTest(testFn: TestFn<TDriver>): Promise<void>;
  function runTest(
    options: RunTestOptions,
    testFn: TestFn<TDriver>
  ): Promise<void>;
  function runTest(
    optionsOrTestFn: RunTestOptions | TestFn<TDriver>,
    maybeTestFn?: TestFn<TDriver>
  ): Promise<void> {
    if (typeof optionsOrTestFn === "function") {
      return config.runTest({}, optionsOrTestFn);
    }
    return config.runTest(optionsOrTestFn, maybeTestFn!);
  }

  describe("next actor API impl", () => {
    test("next_actor: many simultaneous calls produce unique IDs", () =>
      runTest(async (driver) => {
        // Call next_actor 1000 times concurrently
        const actors = new Set(
          await Promise.all(
            Array.from({ length: 1000 }).map(() => driver.next_actor())
          )
        );

        // The set contains 1000 unique elements
        expect(actors.size).toEqual(1000);

        // And all 1000 values are between 0 <= actor <= 999
        for (const actor of actors) {
          expect(actor).toBeGreaterThanOrEqual(0);
          expect(999).toBeGreaterThanOrEqual(actor);
        }
      }));
  });

  describe("nodes API impl", () => {
    test("get_node and iter_nodes with empty store contains root", () =>
      runTest(async (driver) => {
        const db = await driver.load_nodes_api(blackHole);
        expect(db.get_node("non-existing")).toEqual(undefined);

        // Root node always exists, even in an empty store
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: {},
        });
      }));

    test("get_node and iter_nodes with empty store contains root", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeKey(),

            async (key) => {
              fc.pre(key !== "root");

              const db = await driver.load_nodes_api(blackHole);
              expect(db.get_node(key)).toEqual(undefined);
              expect(Array.from(db.iter_nodes())).toEqual([
                ["root", { type: CrdtType.OBJECT, data: {} }],
              ]);
            }
          )
        )
      ));

    test("set_object_data + get_node", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.rootNodeTuple(),

            async ([key, value]) => {
              const db = await withDefaultDocument(driver);

              await db.set_object_data("root", value.data, true);
              expect(db.get_node(key)).toEqual(value);
            }
          )
        )
      ));

    test("set_child + get_node", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.childNodeTuple(),

            async ([key, value]) => {
              const db = await withDefaultDocument(driver);

              await db.set_child(key, value, true);
              expect(db.get_node(key)).toEqual(value);
            }
          )
        )
      ));

    test("has_node: root always exists", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        expect(db.has_node("root")).toBe(true);
      }));

    test("has_node: non-existing node returns false", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        expect(db.has_node("non-existing")).toBe(false);
      }));

    test("has_node: returns true after set, false after delete", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.childNodeTuple(),

            async ([key, value]) => {
              const db = await withDefaultDocument(driver);

              expect(db.has_node(key)).toBe(false);
              await db.set_child(key, value, true);
              expect(db.has_node(key)).toBe(true);
              await db.delete_node(key);
              expect(db.has_node(key)).toBe(false);
            }
          )
        )
      ));

    test("has_node: consistent with get_node", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),

            async (entries) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              await write_nodes(db, entries);

              // has_node should be true iff get_node returns a value
              for (const [key] of entries) {
                expect(db.has_node(key)).toBe(db.get_node(key) !== undefined);
              }
            }
          )
        )
      ));

    test("get_child_at: returns undefined for empty store", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        expect(db.get_child_at("root", "someKey")).toBe(undefined);
        expect(db.get_child_at("non-existing", "someKey")).toBe(undefined);
      }));

    test("get_child_at: returns undefined for empty store (property)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeKey(),
            arb.nodeKey(),

            async (parentId, parentKey) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              expect(db.get_child_at(parentId, parentKey)).toBe(undefined);
            }
          )
        )
      ));

    test("set_child: throws if parent does not exist (orphan)", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Trying to add a node with a non-existent parentId should throw
        await expectToThrow(
          () =>
            db.set_child("0:0", {
              type: CrdtType.LIST,
              parentId: "nonexistent-parent",
              parentKey: "myList",
            }),
          /no such parent/i
        );
      }));

    test("set_child: throws if parent does not exist (ref cycle)", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Trying to add a node with a non-existent parentId should throw
        await expectToThrow(
          () =>
            db.set_child("0:0", {
              type: CrdtType.LIST,
              parentId: "0:0",
              parentKey: "myList",
            }),
          /no such parent/i
        );
      }));

    test("set_child: orphan node is not added after throw", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Try to add orphan, catch the error
        try {
          await db.set_child("0:0", {
            type: CrdtType.LIST,
            parentId: "nonexistent-parent",
            parentKey: "myList",
          });
        } catch {
          // Expected to throw
        }

        // The orphan node should not exist in storage
        expect(db.get_node("0:0")).toBe(undefined);
      }));

    test("set_child: throws if adding a register under an object", () =>
      runTest(async (driver) => {
        const db = await withDefaultDocument(driver);

        // Register under LiveList works
        await db.set_child("0:0", {
          type: CrdtType.REGISTER,
          parentId: "0:dl", // LiveList
          parentKey: "r",
          data: 42,
        });

        // Register under LiveMap works
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:dm", // LiveMap
          parentKey: "r",
          data: 42,
        });

        // Register under LiveObject does not work
        await expectToThrow(
          () =>
            db.set_child("0:2", {
              type: CrdtType.REGISTER,
              parentId: "0:do",
              parentKey: "r",
              data: 42,
            }),
          /cannot add register under object/i
        );

        // Root is also a LiveObject, so this also does not work
        await expectToThrow(
          () =>
            db.set_child("0:3", {
              type: CrdtType.REGISTER,
              parentId: "root",
              parentKey: "r",
              data: 42,
            }),
          /cannot add register under object/i
        );
      }));

    test("get_child_at: returns child id after set", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });

        expect(db.get_child_at("root", "myList")).toBe("0:0");
        expect(db.get_child_at("root", "otherKey")).toBe(undefined);
      }));

    test("get_child_at: returns undefined after delete", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        expect(db.get_child_at("root", "myList")).toBe("0:0");

        await db.delete_node("0:0");
        expect(db.get_child_at("root", "myList")).toBe(undefined);
      }));

    test("get_child_at: returns undefined after set_object_data would overwrite it", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        expect(db.get_child_at("root", "myList")).toBe("0:0");

        await db.set_object_data("root", { myList: [1, 2, 3] }, true);
        expect(db.get_child_at("root", "myList")).toBe(undefined);
      }));

    test("get_child_at: tracks nested children", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // root -> list -> register
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "hello",
        });

        expect(db.get_child_at("root", "myList")).toBe("0:0");
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:1");
        expect(db.get_child_at("0:1", "anything")).toBe(undefined);
      }));

    test("get_child_at: consistent with iter_nodes", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),

            async (entries) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              await write_nodes(db, entries);

              // For each node with a parent, get_child_at(parentId, parentKey) should return the node's id
              for (const node of db.iter_nodes()) {
                if (!isRootStorageNode(node)) {
                  const [id, crdt] = node;
                  expect(db.get_child_at(crdt.parentId, crdt.parentKey)).toBe(
                    id
                  );
                }
              }
            }
          )
        )
      ));

    test("has_child_at: returns false for empty store", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        expect(db.has_child_at("root", "someKey")).toBe(false);
        expect(db.has_child_at("non-existing", "someKey")).toBe(false);
      }));

    test("has_child_at: returns false for empty store (property)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeKey(),
            arb.nodeKey(),

            async (parentId, parentKey) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              expect(db.has_child_at(parentId, parentKey)).toBe(false);
            }
          )
        )
      ));

    test("has_child_at: returns true after set, false after delete", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        expect(db.has_child_at("root", "myList")).toBe(false);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });

        expect(db.has_child_at("root", "myList")).toBe(true);
        expect(db.has_child_at("root", "otherKey")).toBe(false);

        await db.delete_node("0:0");
        expect(db.has_child_at("root", "myList")).toBe(false);
      }));

    test("has_child_at: consistent with get_child_at", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),
            arb.nodeKey(),
            arb.nodeKey(),

            async (entries, parentId, parentKey) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              await write_nodes(db, entries);

              // has_child_at should be true iff get_child_at returns a value
              expect(db.has_child_at(parentId, parentKey)).toBe(
                db.get_child_at(parentId, parentKey) !== undefined
              );
            }
          )
        )
      ));

    test("get_next_sibling: returns undefined for empty parent", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // No children under root, so no next position
        expect(db.get_next_sibling("root", FIRST_POSITION)).toBe(undefined);
        expect(db.get_next_sibling("non-existing", FIRST_POSITION)).toBe(
          undefined
        );
      }));

    test("get_next_sibling: returns undefined when no positions after", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Add a list with one item at FIRST_POSITION
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item1",
        });

        // No position after 2nd
        expect(db.get_next_sibling("0:0", SECOND_POSITION)).toBe(undefined);
        // Position before 2nd should find 1st
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(
          SECOND_POSITION
        );
      }));

    test("get_next_sibling: finds next position in ordered list", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Create list with items at FIRST, SECOND, THIRD positions
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item1",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: THIRD_POSITION,
          data: "item2",
        });

        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(
          SECOND_POSITION
        );
        expect(db.get_next_sibling("0:0", SECOND_POSITION)).toBe(
          THIRD_POSITION
        );
        expect(db.get_next_sibling("0:0", THIRD_POSITION)).toBe(undefined);
        // From 2.5'th position, still goes to 3rd
        expect(
          db.get_next_sibling(
            "0:0",
            makePosition(SECOND_POSITION, THIRD_POSITION)
          )
        ).toBe(THIRD_POSITION);
      }));

    test("get_next_sibling: updates after delete", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item1",
        });
        await db.set_child("0:3", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: THIRD_POSITION,
          data: "item3",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item2",
        });

        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(
          SECOND_POSITION
        );

        await db.delete_node("0:2");
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(THIRD_POSITION);

        await db.delete_node("0:3");
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(undefined);
      }));

    test("move: changes parentKey of node", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item",
        });

        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:1");
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe(undefined);

        await db.move_sibling("0:1", SECOND_POSITION);

        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe(undefined);
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe("0:1");

        // Verify node data is preserved
        const node = db.get_node("0:1");
        expect(node).toEqual({
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item",
        });
      }));

    test("move: updates get_next_sibling correctly", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item1",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: THIRD_POSITION,
          data: "item2",
        });

        // Before move: FIRST -> THIRD
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(THIRD_POSITION);

        // Move first item to second position
        await db.move_sibling("0:1", SECOND_POSITION);

        // After move: SECOND -> THIRD
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(
          SECOND_POSITION
        );
        expect(db.get_next_sibling("0:0", SECOND_POSITION)).toBe(
          THIRD_POSITION
        );
      }));

    test("move: multiple moves on same node", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item",
        });

        await db.move_sibling("0:1", SECOND_POSITION);
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe("0:1");

        await db.move_sibling("0:1", THIRD_POSITION);
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe(undefined);
        expect(db.get_child_at("0:0", THIRD_POSITION)).toBe("0:1");

        await db.move_sibling("0:1", FIRST_POSITION);
        expect(db.get_child_at("0:0", THIRD_POSITION)).toBe(undefined);
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:1");
      }));

    test("move: preserves other siblings", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item1",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item2",
        });
        await db.set_child("0:3", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: THIRD_POSITION,
          data: "item3",
        });

        // Move middle item to a new position between first and itself (effectively a no-change scenario)
        const BETWEEN_FIRST_AND_SECOND = makePosition(
          FIRST_POSITION,
          SECOND_POSITION
        );
        await db.move_sibling("0:2", BETWEEN_FIRST_AND_SECOND);

        // Other items should be unaffected
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:1");
        expect(db.get_child_at("0:0", THIRD_POSITION)).toBe("0:3");
        expect(db.get_child_at("0:0", BETWEEN_FIRST_AND_SECOND)).toBe("0:2");
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe(undefined);
      }));

    test("move: throws when target position is occupied", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item1",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item2",
        });

        // Move 0:1 to SECOND_POSITION should throw since 0:2 is there
        await expectToThrow(
          () => db.move_sibling("0:1", SECOND_POSITION),
          /pos.*already taken/i
        );

        // Both nodes should remain unchanged
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:1");
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe("0:2");
        expect(db.has_node("0:1")).toBe(true);
        expect(db.has_node("0:2")).toBe(true);
      }));

    test("delete_child_key: removes static data key from object", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_object_data("root", { a: 1, b: 2, c: 3 });

        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, b: 2, c: 3 },
        });

        await db.delete_child_key("root", "b");

        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, c: 3 },
        });
      }));

    test("delete_child_key: removes child node", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });

        expect(db.has_node("0:0")).toBe(true);
        expect(db.get_child_at("root", "myList")).toBe("0:0");

        await db.delete_child_key("root", "myList");

        expect(db.has_node("0:0")).toBe(false);
        expect(db.get_child_at("root", "myList")).toBe(undefined);
      }));

    test("delete_child_key: removes child node and its descendants recursively", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // root -> list -> register
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item1",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item2",
        });

        expect(db.has_node("0:0")).toBe(true);
        expect(db.has_node("0:1")).toBe(true);
        expect(db.has_node("0:2")).toBe(true);

        await db.delete_child_key("root", "myList");

        expect(db.has_node("0:0")).toBe(false);
        expect(db.has_node("0:1")).toBe(false);
        expect(db.has_node("0:2")).toBe(false);
      }));

    test("delete_child_key: no-op for non-existing key", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_object_data("root", { a: 1 });

        // Should not throw
        await db.delete_child_key("root", "nonexistent");
        await db.delete_child_key("nonexistent-node", "somekey");

        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1 },
        });
      }));

    test("delete_child_key: preserves sibling data and nodes", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        await db.set_object_data("root", { a: 1, b: 2 });
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "list1",
        });
        await db.set_child("0:1", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "list2",
        });

        await db.delete_child_key("root", "a");
        await db.delete_child_key("root", "list1");

        // Siblings should be preserved
        const rootNode = db.get_node("root");
        expect(rootNode).toEqual({
          type: CrdtType.OBJECT,
          data: { b: 2 },
        });
        expect(db.has_node("0:0")).toBe(false);
        expect(db.has_node("0:1")).toBe(true);
        expect(db.get_child_at("root", "list2")).toBe("0:1");
      }));

    test("set + iter_nodes", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeMap(),

            async (entries) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);

              await write_nodes(db, entries as NodeStream);

              // iter_nodes includes all inserted children
              for (const [key, value] of db.iter_nodes()) {
                if (entries.has(key)) {
                  expect(value).toEqual(entries.get(key));
                } else {
                  expect(key).toEqual("root");
                }
              }
            }
          )
        )
      ));

    test("set_child overwrites existing node, delete_node removes it", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeKey(),
            arb.serializedChild(),
            arb.serializedChild(),

            async (key, value1, value2) => {
              fc.pre(key !== "root");

              const db = await withDefaultDocument(driver);

              await db.set_child(key, value1, true);
              await db.set_child(key, value2, true); // overwrite same key
              expect(db.get_node(key)).toEqual(value2);

              await delete_nodes(db, [key]);
              expect(db.get_node(key)).toEqual(undefined);
            }
          )
        )
      ));

    test("delete_nodes (single key)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            // Generate 3 non-root pairs where all node IDs and parentIds are unique
            // (6 unique values total), ensuring no cross-references between entries
            fc
              .tuple(
                arb.childNodeTuple(),
                arb.childNodeTuple(),
                arb.childNodeTuple()
              )
              .filter(
                ([e1, e2, e3]) =>
                  new Set([
                    e1[0],
                    e2[0],
                    e3[0],
                    e1[1].parentId,
                    e2[1].parentId,
                    e3[1].parentId,
                  ]).size === 6
              ),

            async ([entry1, entry2, entry3]) => {
              const db = await withDefaultDocument(driver);
              await write_nodes(db, [entry1, entry2, entry3]);

              const key1 = entry1[0];
              const key2 = entry2[0];
              const key3 = entry3[0];

              expect(new Set(imap(db.iter_nodes(), ([k]) => k))).toEqual(
                new Set([...KNOWN_DOC_KEYS, key1, key2, key3])
              );
              await delete_nodes(db, [key1]);
              await delete_nodes(db, [key1]); // Deleting twice has no effect
              expect(new Set(imap(db.iter_nodes(), ([k]) => k))).toEqual(
                new Set([...KNOWN_DOC_KEYS, key2, key3])
              );
              await delete_nodes(db, [key2]);
              await delete_nodes(db, [key2]); // Deleting twice has no effect
              expect(new Set(imap(db.iter_nodes(), ([k]) => k))).toEqual(
                new Set([...KNOWN_DOC_KEYS, key3])
              );
            }
          )
        )
      ));

    test("deleting the root is a no-op", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        await db.set_object_data("root", { foo: 42 });

        // Try to delete the root node
        await db.delete_node("root");

        // ...it should not work
        expect(Array.from(db.iter_nodes())).toEqual([
          ["root", { type: CrdtType.OBJECT, data: { foo: 42 } }],
          //                                      ^^^^^^^^^^^ Still there
        ]);
      }));

    test("write_nodes + get_node loop", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeMap(),

            async (entries) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              expect(Array.from(db.iter_nodes())).toEqual([
                ["root", { type: CrdtType.OBJECT, data: {} }],
              ]);

              // Write all the entries (can have dupes)
              await write_nodes(db, entries as NodeStream);

              // Check that get_node returns expected results
              const map = new Map<string, SerializedCrdt>(entries); // de-dupe
              for (const [key, expected] of map) {
                expect(db.get_node(key)).toEqual(expected);
              }
            }
          )
        )
      ));

    test("write_nodes + iter_nodes", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeMap(),

            async (entries) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              expect(Array.from(db.iter_nodes())).toEqual([
                ["root", { type: CrdtType.OBJECT, data: {} }],
              ]);

              // Write all the entries (can have dupes)
              await write_nodes(db, entries as NodeStream);

              for (const [key, value] of db.iter_nodes()) {
                if (entries.has(key)) {
                  expect(value).toEqual(entries.get(key));
                } else {
                  expect(key).toEqual("root");
                }
              }

              // Check that readone will also have the same results
              const map = new Map(entries); // de-dupe
              for (const [key, expected] of map) {
                expect(db.get_node(key)).toEqual(expected);
              }
            }
          )
        )
      ));

    test("delete_nodes", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),

            async (entries) => {
              await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
              const db = await driver.load_nodes_api(blackHole);
              await write_nodes(db, entries);

              await delete_nodes(
                db,
                new Map<string, SerializedCrdt>(entries).keys()
              );
              for (const [key] of db.iter_nodes()) {
                // Only "root" should remain - all entries should be deleted
                expect(key).toEqual("root");
              }
            }
          )
        )
      ));

    test("delete_nodes (with more than 64 keys)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream({
              depthSize: "xlarge",
              maxKeys: 100,
              maxLength: 100,
            }),

            async (entries) => {
              const db = await withDefaultDocument(driver);
              await write_nodes(db, entries);

              expect(Array.from(db.iter_nodes()).length).toBeGreaterThan(2); // "root" + at least 1 node

              const originalRootData = (
                db.get_node("root") as SerializedRootObject
              ).data;

              await delete_nodes(
                db,
                new Map<string, SerializedCrdt>(entries).keys()
              );
              await delete_nodes(db, KNOWN_DOC_KEYS); // finally also delete the keys from the default document
              expect(Array.from(db.iter_nodes())).toEqual([
                ["root", { type: CrdtType.OBJECT, data: originalRootData }],
              ]);
            }
          ),
          { numRuns: 1 }
        )
      ));

    test("get_snapshot: get_node returns same data as driver (when unchanged)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),

            async (entries) => {
              const db = await withDefaultDocument(driver);
              await write_nodes(db, entries);

              const snapshot = db.get_snapshot();

              // Snapshot should return the same data as the driver
              for (const [id] of entries) {
                expect(snapshot.get_node(id)).toEqual(db.get_node(id));
              }
            }
          )
        )
      ));

    test("get_snapshot: iter_children returns same data as driver (when unchanged)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),

            async (entries) => {
              const db = await withDefaultDocument(driver);
              await write_nodes(db, entries);

              const snapshot = db.get_snapshot();

              // Build expected children of root from driver's nodes
              const expected: [string, string][] = [];
              for (const node of db.iter_nodes()) {
                if (!isRootStorageNode(node)) {
                  const [childId, crdt] = node;
                  if (crdt.parentId === "root") {
                    expected.push([crdt.parentKey, childId]);
                  }
                }
              }

              // Check iter_children_of('root') matches (sort both for comparison)
              const sortFn = (a: [string, string], b: [string, string]) =>
                a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
              const snapshotChildren = [...snapshot.iter_children("root")];
              expect(snapshotChildren.sort(sortFn)).toEqual(
                expected.sort(sortFn)
              );
            }
          )
        )
      ));

    // This test verifies snapshot isolation. Writes after taking a snapshot
    // should NOT be visible in the snapshot.
    test("get_snapshot: new nodes after snapshot are not visible", () =>
      runTest(async (driver) => {
        const db = await withDefaultDocument(driver);

        // Take snapshot before adding new node
        const snapshot = db.get_snapshot();

        // Add a new node after taking the snapshot
        const newNode = {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "newList",
        } as const;
        await db.set_child("si:new-node-id", newNode);

        // The new node should exist in the driver
        expect(db.get_node("si:new-node-id")).toEqual(newNode);

        // But NOT in the snapshot (snapshot isolation)
        expect(() => snapshot.get_node("si:new-node-id")).toThrow();
        const snapshotChildren = [...snapshot.iter_children("root")];
        expect(
          snapshotChildren.find(([key]) => key === "newList")
        ).toBeUndefined();
      }));

    // This test verifies snapshot isolation. Deletes after taking a snapshot
    // should NOT affect the snapshot.
    test("get_snapshot: deleted nodes after snapshot are still visible", () =>
      runTest(async (driver) => {
        const db = await withDefaultDocument(driver);

        // Add a node first
        const node = {
          type: CrdtType.MAP,
          parentId: "root",
          parentKey: "myMap",
        } as const;
        await db.set_child("si:node-to-delete", node);

        // Take snapshot before deleting
        const snapshot = db.get_snapshot();

        // Verify node exists in both driver and snapshot
        expect(db.get_node("si:node-to-delete")).toEqual(node);

        // Delete the node after taking the snapshot
        await db.delete_node("si:node-to-delete");

        // The node should NOT exist in the driver anymore
        expect(db.get_node("si:node-to-delete")).toBeUndefined();

        // But should STILL exist in the snapshot (snapshot isolation)
        const snapshotChildren = [...snapshot.iter_children("root")];
        expect(snapshotChildren.find(([key]) => key === "myMap")).toEqual([
          "myMap",
          "si:node-to-delete",
        ]);
        expect(snapshot.get_node("si:node-to-delete")).toEqual(node);
      }));

    test("get_snapshot: delete_child_key on static data does not affect snapshot", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        await db.set_object_data("root", { a: 1, b: 2, c: 3 });

        // Take snapshot before deleting a key
        const snapshot = db.get_snapshot();

        // Delete a static data key after taking the snapshot
        await db.delete_child_key("root", "b");

        // Driver should reflect the deletion
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, c: 3 },
        });

        // Snapshot should still have the original data (snapshot isolation)
        expect(snapshot.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, b: 2, c: 3 },
        });
      }));

    test("get_snapshot: set_object_data after snapshot does not affect snapshot", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        await db.set_object_data("root", { a: 1, b: 2 });

        // Take snapshot before mutating
        const snapshot = db.get_snapshot();

        // Mutate data after taking the snapshot
        await db.set_object_data("root", { a: 1, b: 2, c: 3 });

        // Driver should reflect the update
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, b: 2, c: 3 },
        });

        // Snapshot should still have the original data (snapshot isolation)
        expect(snapshot.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, b: 2 },
        });
      }));

    test("get_snapshot: iter_all returns same nodes as driver", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.nodeStream(),

            async (entries) => {
              const db = await withDefaultDocument(driver);
              await write_nodes(db, entries);

              const snapshot = db.get_snapshot();
              const snapshotNodes = new Map<string, SerializedCrdt>([
                ...snapshot.iter_all(),
              ]);

              // Should contain the same node ids as the driver
              const driverNodes = new Map<string, SerializedCrdt>([
                ...db.iter_nodes(),
              ]);
              expect(snapshotNodes.size).toBe(driverNodes.size);
              for (const [id, crdt] of driverNodes) {
                expect(snapshotNodes.get(id)).toEqual(crdt);
              }
            }
          )
        )
      ));

    test("get_snapshot: iter_all has snapshot isolation", () =>
      runTest(async (driver) => {
        const db = await withDefaultDocument(driver);

        // Add a node
        const node = {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        } as const;
        await db.set_child("si:before-snap", node);

        // Take snapshot
        const snapshot = db.get_snapshot();

        // Add another node after snapshot
        await db.set_child("si:after-snap", {
          type: CrdtType.MAP,
          parentId: "root",
          parentKey: "myMap",
        });

        // iter_all should see the pre-snapshot node but not the post-snapshot one
        const snapshotNodes = new Map<string, SerializedCrdt>([
          ...snapshot.iter_all(),
        ]);
        expect(snapshotNodes.has("si:before-snap")).toBe(true);
        expect(snapshotNodes.has("si:after-snap")).toBe(false);
        expect(snapshotNodes.has("root")).toBe(true);
      }));

    test("get_snapshot: iter_all on empty room returns only root", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);
        const snapshot = db.get_snapshot();
        const nodes = [...snapshot.iter_all()];
        expect(nodes).toEqual([["root", { type: CrdtType.OBJECT, data: {} }]]);
      }));
  });

  describe("synchronous read-after-write semantics", () => {
    // These tests verify that writes are immediately visible to synchronous reads,
    // even before the returned Promise is awaited. This is critical behavior for
    // the INewNodeStorageDriver API.

    test("set: read sees new node before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        const node = {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        } as const;

        // Call set but don't await yet
        const p$ = db.set_child("0:0", node);

        // Read should see the node immediately (synchronously)
        expect(db.get_node("0:0")).toEqual(node);
        expect(db.has_node("0:0")).toBe(true);
        expect(db.get_child_at("root", "myList")).toBe("0:0");
        expect(db.has_child_at("root", "myList")).toBe(true);

        // After await, should still see the node
        await p$;
        expect(db.get_node("0:0")).toEqual(node);
        expect(db.has_node("0:0")).toBe(true);
        expect(db.get_child_at("root", "myList")).toBe("0:0");
        expect(db.has_child_at("root", "myList")).toBe(true);
      }));

    test("delete: read sees deletion before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // First create a node
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        expect(db.has_node("0:0")).toBe(true);

        // Call delete but don't await yet
        const p$ = db.delete_node("0:0");

        // Read should NOT see the node immediately (synchronously)
        expect(db.get_node("0:0")).toBe(undefined);
        expect(db.has_node("0:0")).toBe(false);
        expect(db.get_child_at("root", "myList")).toBe(undefined);
        expect(db.has_child_at("root", "myList")).toBe(false);

        // After await, should still NOT see the node
        await p$;
        expect(db.get_node("0:0")).toBe(undefined);
        expect(db.has_node("0:0")).toBe(false);
        expect(db.get_child_at("root", "myList")).toBe(undefined);
        expect(db.has_child_at("root", "myList")).toBe(false);
      }));

    test("move: read sees new position before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Create a list with an item
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item",
        });
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:1");
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe(undefined);

        // Call move but don't await yet
        const p$ = db.move_sibling("0:1", SECOND_POSITION);

        // Read should see the new position immediately (synchronously)
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe(undefined);
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe("0:1");
        expect(db.get_node("0:1")).toEqual({
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item",
        });

        // After await, should still see the new position
        await p$;
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe(undefined);
        expect(db.get_child_at("0:0", SECOND_POSITION)).toBe("0:1");
        expect(db.get_node("0:1")).toEqual({
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "item",
        });
      }));

    test("set_object_data: read sees new data before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Start with empty root
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: {},
        });

        // Call set_object_data but don't await yet
        const p$ = db.set_object_data("root", { foo: 42, bar: "hello" });

        // Read should see the new data immediately (synchronously)
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { foo: 42, bar: "hello" },
        });

        // After await, should still see the new data
        await p$;
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { foo: 42, bar: "hello" },
        });
      }));

    test("set_object_data: no-op if called on a non-object node", () =>
      runTest(async (driver) => {
        const db = await withDefaultDocument(driver);

        const listBefore = db.get_node("0:dl");
        const mapBefore = db.get_node("0:dm");

        // set_object_data on a LiveList is a no-op
        await db.set_object_data("0:dl", { foo: 42 });
        expect(db.get_node("0:dl")).toEqual(listBefore);

        // set_object_data on a LiveMap is a no-op
        await db.set_object_data("0:dm", { foo: 42 });
        expect(db.get_node("0:dm")).toEqual(mapBefore);

        // set_object_data on a LiveObject should work
        await db.set_object_data("0:do", { foo: 42 });
        expect(db.get_node("0:do")).toEqual({
          type: CrdtType.OBJECT,
          parentId: "root",
          parentKey: "o",
          data: { foo: 42 },
        });
      }));

    test("delete_child_key: read sees deletion before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Set up root with static data and a child node
        await db.set_object_data("root", { a: 1, b: 2 });
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });

        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { a: 1, b: 2 },
        });
        expect(db.has_node("0:0")).toBe(true);

        // Call delete_child_key for static data but don't await yet
        const p1$ = db.delete_child_key("root", "a");

        // Read should see the deletion immediately (synchronously)
        expect(db.get_node("root")).toEqual({
          type: CrdtType.OBJECT,
          data: { b: 2 },
        });

        await p1$;

        // Call delete_child_key for child node but don't await yet
        const p2$ = db.delete_child_key("root", "myList");

        // Read should see the child deletion immediately (synchronously)
        expect(db.has_node("0:0")).toBe(false);
        expect(db.get_child_at("root", "myList")).toBe(undefined);
        expect(db.has_child_at("root", "myList")).toBe(false);

        // After await, should still see the deletion
        await p2$;
        expect(db.has_node("0:0")).toBe(false);
        expect(db.get_child_at("root", "myList")).toBe(undefined);
        expect(db.has_child_at("root", "myList")).toBe(false);
      }));

    test("multiple writes: all visible before any await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Perform multiple writes without awaiting any of them
        const p1$ = db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "list1",
        });
        const p2$ = db.set_child("0:1", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "list2",
        });
        const p3$ = db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "item",
        });

        // All writes should be visible synchronously
        expect(db.has_node("0:0")).toBe(true);
        expect(db.has_node("0:1")).toBe(true);
        expect(db.has_node("0:2")).toBe(true);
        expect(db.get_child_at("root", "list1")).toBe("0:0");
        expect(db.get_child_at("root", "list2")).toBe("0:1");
        expect(db.get_child_at("0:0", FIRST_POSITION)).toBe("0:2");

        // iter_nodes should see all nodes
        const nodes = new Map<string, SerializedCrdt>(db.iter_nodes());
        expect(nodes.size).toBe(4); // root + 3 nodes
        expect(nodes.has("root")).toBe(true);
        expect(nodes.has("0:0")).toBe(true);
        expect(nodes.has("0:1")).toBe(true);
        expect(nodes.has("0:2")).toBe(true);

        // After awaiting, should still see all nodes
        await Promise.all([p1$, p2$, p3$]);
        expect(db.has_node("0:0")).toBe(true);
        expect(db.has_node("0:1")).toBe(true);
        expect(db.has_node("0:2")).toBe(true);
      }));

    test("interleaved write and delete: reads see correct state", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Create a node
        const p1$ = db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });

        // Should be visible immediately
        expect(db.has_node("0:0")).toBe(true);

        // Delete it (without awaiting the create)
        const p2$ = db.delete_node("0:0");

        // Should NOT be visible anymore
        expect(db.has_node("0:0")).toBe(false);
        expect(db.get_child_at("root", "myList")).toBe(undefined);

        // Re-create it (without awaiting the delete)
        const p3$ = db.set_child("0:1", {
          type: CrdtType.MAP,
          parentId: "root",
          parentKey: "myList",
        });

        // Should see the new node
        expect(db.has_node("0:1")).toBe(true);
        expect(db.get_child_at("root", "myList")).toBe("0:1");
        expect(db.get_node("0:1")).toEqual({
          type: CrdtType.MAP,
          parentId: "root",
          parentKey: "myList",
        });

        // After awaiting all, state should be consistent
        await Promise.all([p1$, p2$, p3$]);
        expect(db.has_node("0:0")).toBe(false);
        expect(db.has_node("0:1")).toBe(true);
        expect(db.get_child_at("root", "myList")).toBe("0:1");
      }));

    test("get_next_sibling: updated before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Create a list with two items
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "first",
        });
        await db.set_child("0:2", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: THIRD_POSITION,
          data: "third",
        });

        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(THIRD_POSITION);

        // Add a node in between without awaiting
        const p$ = db.set_child("0:3", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "second",
        });

        // get_next_sibling should see the new node immediately
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(
          SECOND_POSITION
        );
        expect(db.get_next_sibling("0:0", SECOND_POSITION)).toBe(
          THIRD_POSITION
        );

        // After await, should still work correctly
        await p$;
        expect(db.get_next_sibling("0:0", FIRST_POSITION)).toBe(
          SECOND_POSITION
        );
        expect(db.get_next_sibling("0:0", SECOND_POSITION)).toBe(
          THIRD_POSITION
        );
      }));

    test("set with overwrite: read sees update before await", () =>
      runTest(async (driver) => {
        await driver.DANGEROUSLY_reset_nodes(EMPTY_DOC);
        const db = await driver.load_nodes_api(blackHole);

        // Create a list to hold registers
        await db.set_child("0:0", {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "myList",
        });

        // Create initial register in the list
        await db.set_child("0:1", {
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "initial",
        });

        expect(db.get_node("0:1")).toEqual({
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "initial",
        });

        // Overwrite with allowOverwrite=true but don't await
        const p$ = db.set_child(
          "0:1",
          {
            type: CrdtType.REGISTER,
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "updated",
          },
          true
        );

        // Should see updated value immediately
        expect(db.get_node("0:1")).toEqual({
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "updated",
        });

        // After await, should still see updated value
        await p$;
        expect(db.get_node("0:1")).toEqual({
          type: CrdtType.REGISTER,
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "updated",
        });
      }));
  });

  describe("meta API impl", () => {
    test("get_meta with empty store is undefined", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaKey(),

            async (key) => {
              expect(await driver.get_meta(key)).toEqual(undefined);
            }
          )
        )
      ));

    test("put_meta + get_meta", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaPair(),

            async ([key, value]) => {
              await driver.put_meta(key, value);
              expect(await driver.get_meta(key)).toEqual(value);
            }
          )
        )
      ));

    test("put_meta + get_meta loop", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            fc.array(arb.metaPair()).map((x) => new Map(x)),

            async (entries) => {
              for (const [key, value] of entries) {
                await driver.put_meta(key, value);
              }

              for (const [key, value] of entries) {
                expect(await driver.get_meta(key)).toEqual(value);
              }
            }
          )
        )
      ));

    test("put_meta + delete_meta + get_meta", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaKey(),
            arb.json(),
            arb.json(),

            async (key, value1, value2) => {
              await driver.put_meta(key, value1);
              await driver.put_meta(key, value2); // override
              expect(await driver.get_meta(key)).toEqual(value2);

              await driver.delete_meta(key);
              expect(await driver.get_meta(key)).toEqual(undefined);
            }
          )
        )
      ));

    test("put_meta loop + get_meta loop", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaEntries(),

            async (entries) => {
              // Write all the entries (can have dupes)
              await Promise.all(
                Array.from(entries).map(([key, value]) =>
                  driver.put_meta(key, value)
                )
              );

              // Check that readone will also have the same results
              const map = new Map(entries); // de-dupe
              for (const [key, expected] of map) {
                expect(await driver.get_meta(key)).toEqual(expected);
              }
            }
          )
        )
      ));

    test("put_meta + get_meta loop", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaEntries(),

            async (entries) => {
              // Write all the entries (can have dupes)
              for (const [key, value] of entries) {
                await driver.put_meta(key, value);
              }

              // Check that readone will also have the same results
              const map = new Map(entries); // de-dupe
              for (const [key, expected] of map) {
                expect(await driver.get_meta(key)).toEqual(expected);
              }
            }
          )
        )
      ));

    test("delete_meta (all keys)", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaEntries(),

            async (entries) => {
              for (const [key, value] of entries) {
                await driver.put_meta(key, value);
              }

              for (const key of new Map(entries).keys()) {
                await driver.delete_meta(key);
              }
              for (const [key] of entries) {
                expect(await driver.get_meta(key)).toEqual(undefined);
              }
            }
          )
        )
      ));

    test("delete_meta", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.metaPair(),
            arb.metaPair(),
            arb.metaPair(),

            async (entry1, entry2, entry3) => {
              fc.pre(entry1[0] !== entry2[0]);
              fc.pre(entry1[0] !== entry3[0]);
              fc.pre(entry2[0] !== entry3[0]);

              await Promise.all([
                driver.put_meta(...entry1),
                driver.put_meta(...entry2),
                driver.put_meta(...entry3),
              ]);

              const key1 = entry1[0];
              const key2 = entry2[0];
              const key3 = entry3[0];

              expect(await driver.get_meta(key1)).not.toEqual(undefined);
              expect(await driver.get_meta(key2)).not.toEqual(undefined);
              expect(await driver.get_meta(key3)).not.toEqual(undefined);
              await driver.delete_meta(key1);
              await driver.delete_meta(key1);
              expect(await driver.get_meta(key1)).toEqual(undefined);
              expect(await driver.get_meta(key2)).not.toEqual(undefined);
              expect(await driver.get_meta(key3)).not.toEqual(undefined);
              await driver.delete_meta(key2);
              await driver.delete_meta(key2);
              expect(await driver.get_meta(key1)).toEqual(undefined);
              expect(await driver.get_meta(key2)).toEqual(undefined);
              expect(await driver.get_meta(key3)).not.toEqual(undefined);
            }
          )
        )
      ));
  });

  describe("ydoc API impl", () => {
    test("iter_y_updates on an empty store is empty", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            arb.docId(),

            async (docId) => {
              expect(Array.from(await driver.iter_y_updates(docId))).toEqual(
                []
              );
            }
          )
        )
      ));

    test("write_y_updates + iter_y_updates", () =>
      runTest(async (driver) =>
        fc.assert(
          fc.asyncProperty(
            fc.tuple(arb.docId(), arb.docId()).filter(([a, b]) => a !== b),
            fc
              .array(fc.tuple(arb.key(), fc.uint8Array()))
              .map((x) => new Map(x)),

            async ([docId, anotherDocId], entries) => {
              await driver.DANGEROUSLY_wipe_all_y_updates();

              for (const [key, data] of entries) {
                await driver.write_y_updates(docId, key, data);
              }
              expect(new Map(await driver.iter_y_updates(docId))).toEqual(
                entries
              );
              expect(
                new Map(await driver.iter_y_updates(anotherDocId))
              ).toEqual(new Map());
            }
          )
        )
      ));
  });

  describe("Storage behavior (high-level)", () => {
    /**
     * Helper to create a Storage instance backed by the driver. The raw nodes
     * are already pre-populated by config.runTest.
     */
    function runWithStorage<R>(
      driver: TDriver,
      callback: (arg: { storage: Storage }) => R | Promise<R>
    ): Promise<R> {
      // Create the access layer around the plugin
      const storage = new Storage(driver);

      const logger = {
        warn: () => {},
        error: () => {},
      } as unknown as Logger;

      return (async () => {
        await storage.load(logger);

        // Self-check after loading
        await selfCheck(storage);

        return callback({ storage });
      })();
    }

    function cmpById(
      [id1]: [string, unknown],
      [id2]: [string, unknown]
    ): number {
      return id1 < id2 ? -1 : id1 > id2 ? 1 : 0;
    }

    /**
     * Asserts that the given nodes exist in-memory, and on-disk.
     *
     * Rules:
     * 1. In-memory: root always exists, must match exactly
     * 2. On-disk:
     *   - If root has data fields → MUST exist on disk with that data
     *   - If root is empty → MAY or MAY NOT exist on disk
     *       - If it exists → it MUST be empty
     *       - If it doesn't exist → that's fine too
     */
    async function assert(s: Storage, expectedNodes: StorageNode[]) {
      const memory = Array.from(s.loadedDriver.iter_nodes());
      const storage = Array.from(await s.raw_iter_nodes());

      expectedNodes = [...expectedNodes].sort(cmpById);
      const inMemoryNodes = [...memory].sort(cmpById);
      const onDiskNodes = storage.sort(cmpById);

      // In-memory must match exactly
      expect(inMemoryNodes).toEqual(expectedNodes);

      // Check if expected root has data
      const expectedRoot = expectedNodes.find(([id]) => id === "root");
      const rootHasData =
        expectedRoot !== undefined &&
        expectedRoot[1].type === CrdtType.OBJECT &&
        Object.keys(expectedRoot[1].data).length > 0;

      if (rootHasData) {
        // Root has data → on-disk MUST match exactly
        expect(onDiskNodes).toEqual(expectedNodes);
      } else {
        // Root is empty → MAY or MAY NOT exist on disk
        // If it exists, it must be empty
        const onDiskRoot = onDiskNodes.find(([id]) => id === "root");
        if (onDiskRoot !== undefined) {
          // Root exists on disk - must be empty
          expect(onDiskRoot[1]).toEqual({ type: CrdtType.OBJECT, data: {} });
          // And everything else must match
          expect(onDiskNodes).toEqual(expectedNodes);
        } else {
          // Root doesn't exist on disk - everything else must match
          expect(onDiskNodes).toEqual(
            expectedNodes.filter(([id]) => id !== "root")
          );
        }
      }
    }

    test("loading storage should not persist empty root node in storage", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await assert(storage, [rootObj()]);
        });
      }));

    test("loading storage should persist root node in storage (with data)", () => {
      const nodesOnDisk: NodeMap = new Map();
      nodesOnDisk.set("root", { data: { a: 1 }, type: CrdtType.OBJECT });

      return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await assert(storage, [rootObj({ a: 1 })]);
        });
      });
    });

    test("loading storage should create a virtual root if storage contains items and missing root", () => {
      const nodesOnDisk: NodeMap = new Map();
      nodesOnDisk.set("0:1", {
        data: { a: 1 },
        parentId: "root",
        parentKey: "child",
        type: 0,
      });

      return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await assert(storage, [
            obj("0:1", { a: 1 }, "root", "child"),
            rootObj(),
          ]);
        });
      });
    });

    describe("dealing with corrupted storage", () => {
      test("loading storage fixes child node conflict with static data", () => {
        const corruptedNodesOnDisk: NodeMap = new Map();
        // Root has data.mykey = "static value", but also a child node at parentKey "mykey"
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: { mykey: "static value", otherkey: "kept" },
        });
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "mykey", // 👈 Conflicts with static mykey attribute on root
          type: CrdtType.OBJECT,
          data: { nested: 42 },
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Child node wins - "static value" should have been removed
              await assert(storage, [
                rootObj({ otherkey: "kept" }), // mykey removed from data
                obj("0:0", { nested: 42 }, "root", "mykey"), // child node preserved
              ]);
            });
          }
        );
      });

      test("loading storage fixes register child under root object (dropped)", () => {
        const corruptedNodesOnDisk: NodeMap = new Map();
        // Register nodes under OBJECT parents are invalid - they should be stored as data fields instead
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: { existing: "value" },
        });
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "badregister",
          type: CrdtType.REGISTER,
          data: 42,
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Register under object is dropped (it's a corruption)
              await assert(storage, [
                rootObj({ existing: "value" }), // register is gone, not converted
              ]);
            });
          }
        );
      });

      test("loading storage fixes register child under non-root object (dropped)", () => {
        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: {},
        });
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "child",
          type: CrdtType.OBJECT,
          data: { existing: "value" },
        });
        corruptedNodesOnDisk.set("0:1", {
          parentId: "0:0",
          parentKey: "badregister",
          type: CrdtType.REGISTER,
          data: "should be dropped",
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Register under object is dropped
              await assert(storage, [
                rootObj(),
                obj("0:0", { existing: "value" }, "root", "child"),
              ]);
            });
          }
        );
      });

      test("loading storage fixes register-under-object with deep subtree (entire subtree dropped)", () => {
        // This tests that when an illegal Register (under Object) has a subtree,
        // the entire subtree is properly deleted. With ON DELETE RESTRICT,
        // a naive DELETE would fail with FK error if children aren't deleted first.
        // The grandchild (0:2) is NOT itself illegal (it's Object under Object),
        // so it won't be matched by the sanitizer query - but it still needs deletion.
        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: {},
        });
        // Register under Object is INVALID
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "badregister",
          type: CrdtType.REGISTER,
          data: "bad",
        });
        // Child under the invalid register (also invalid - parent is Register)
        corruptedNodesOnDisk.set("0:1", {
          parentId: "0:0",
          parentKey: "child",
          type: CrdtType.OBJECT,
          data: {},
        });
        // Grandchild - NOT invalid itself (Object under Object), but must be deleted
        corruptedNodesOnDisk.set("0:2", {
          parentId: "0:1",
          parentKey: "grandchild",
          type: CrdtType.OBJECT,
          data: { deep: "node" },
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Entire illegal subtree is dropped
              await assert(storage, [rootObj()]);
            });
          }
        );
      });

      test("loading storage fixes illegal node tree under register (entire subtree dropped)", () => {
        // This tests that when an illegal node (whose parent is a Register) itself
        // has children, the entire subtree is properly deleted. With ON DELETE RESTRICT,
        // a naive DELETE would fail with FK error if children aren't deleted first.
        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: {},
        });
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "list",
          type: CrdtType.LIST,
        });
        // Register under list is valid
        corruptedNodesOnDisk.set("0:1", {
          parentId: "0:0",
          parentKey: "A0:",
          type: CrdtType.REGISTER,
          data: "valid register",
        });
        // Object under register is INVALID (registers can't have children)
        corruptedNodesOnDisk.set("0:2", {
          parentId: "0:1",
          parentKey: "illegal",
          type: CrdtType.OBJECT,
          data: { bad: "node" },
        });
        // Another child under the illegal node - this makes deletion order matter!
        corruptedNodesOnDisk.set("0:3", {
          parentId: "0:2",
          parentKey: "grandchild",
          type: CrdtType.OBJECT,
          data: { even: "deeper" },
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Only root and list remain, the illegal subtree is dropped
              await assert(storage, [
                rootObj(),
                list("0:0", "root", "list"),
                register("0:1", "0:0", "A0:", "valid register"),
              ]);
            });
          }
        );
      });

      test("loading storage fixes static data conflict with JSON null value", () => {
        // This tests that when an Object's jdata contains a key with JSON null value,
        // and a child node exists with the same parent_key, the key is removed from jdata.
        // This requires json_type() instead of json_extract() to detect, because
        // json_extract('{"a":null}', '$.a') returns SQL NULL (indistinguishable from missing key).
        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: { a: null, b: "keep" },
        });
        // Child LiveObject with parent_key "a" conflicts with jdata key "a"
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "a",
          type: CrdtType.OBJECT,
          data: { nested: "value" },
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // The "a" key should be removed from root's data, "b" kept
              await assert(storage, [
                rootObj({ b: "keep" }),
                obj("0:0", { nested: "value" }, "root", "a"),
              ]);
            });
          }
        );
      });

      test.each([
        // Keys with characters that are special in SQLite's JSON path syntax
        // and might produce wrong/invalid paths when drivers don't quote
        // properly in their implementations
        { desc: "dot", key: "a.b" },
        { desc: "open bracket", key: "a[0]" },
        { desc: "empty string", key: "" },
        { desc: "lone double quote", key: '"' },
        { desc: "leading double quote", key: '" ' },

        // Keys that SQLite's forgiving JSON path parser handles fine as bare
        // identifiers, so these work even without quoting explicitly. Still
        // useful to verify these won't mess things up.
        { desc: "double quote", key: 'a"b' },
        { desc: "close bracket", key: "a]b" },
        { desc: "space", key: "a b" },
        { desc: "backslash", key: "a\\b" },
        { desc: "lone backslash", key: "\\" },
        { desc: "single quote", key: "it's" },
        { desc: "double single quote", key: "it''s" },
        { desc: "lone double single quote", key: "''" },
        { desc: "dollar sign", key: "a$b" },
        { desc: "lone dollar sign", key: "$" },
        { desc: "hash", key: "a#b" },
        { desc: "hyphen", key: "a-b" },
      ])(
        "loading storage fixes static data conflict with $desc in key",
        ({ key }) => {
          const corruptedNodesOnDisk: NodeMap = new Map();
          corruptedNodesOnDisk.set("root", {
            type: CrdtType.OBJECT,
            data: { [key]: "conflict", keep: "yes" },
          });
          corruptedNodesOnDisk.set("0:0", {
            parentId: "root",
            parentKey: key,
            type: CrdtType.OBJECT,
            data: { nested: "value" },
          });

          return runTest(
            { initialNodes: corruptedNodesOnDisk },
            async (driver) => {
              await runWithStorage(driver, async ({ storage }) => {
                await assert(storage, [
                  rootObj({ keep: "yes" }),
                  obj("0:0", { nested: "value" }, "root", key),
                ]);
              });
            }
          );
        }
      );

      test("loading storage fixes conflicting siblings (highest node id wins)", () => {
        // SQLite has UNIQUE(parent_id, parent_key), so this corruption can't occur. We just skip the tests in these environments.
        if (config.name === "bun-sqlite" || config.name === "dos-sqlite")
          return Promise.resolve();

        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: {},
        });
        // Conflict at "slot1": 0:0 vs 1:0 → 1:0 wins (lexicographically higher)
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "slot1",
          type: CrdtType.OBJECT,
          data: { id: "0:0", winner: false },
        });
        corruptedNodesOnDisk.set("1:0", {
          parentId: "root",
          parentKey: "slot1", // 👈 Same slot as 0:0
          type: CrdtType.OBJECT,
          data: { id: "1:0", winner: true },
        });
        // Conflict at "slot2": 1:1 vs 0:1 → 1:1 wins (lexicographically higher)
        corruptedNodesOnDisk.set("1:1", {
          parentId: "root",
          parentKey: "slot2",
          type: CrdtType.OBJECT,
          data: { id: "1:1", winner: true },
        });
        corruptedNodesOnDisk.set("0:1", {
          parentId: "root",
          parentKey: "slot2", // 👈 Same slot as 1:1
          type: CrdtType.OBJECT,
          data: { id: "0:1", winner: false },
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Highest node id wins (deterministic across all backends)
              await assert(storage, [
                rootObj(),
                obj("1:0", { id: "1:0", winner: true }, "root", "slot1"),
                obj("1:1", { id: "1:1", winner: true }, "root", "slot2"),
              ]);
            });
          }
        );
      });

      test("loading storage fixes orphaned nodes", () => {
        // DOS-SQLite has a FK constraint (parent_id REFERENCES nodes(id)), so orphaned
        // nodes can't exist - the database itself prevents inserting nodes with
        // non-existent parents. This test only applies to backends without FK constraints.
        if (config.name === "dos-sqlite") return Promise.resolve();

        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: {},
        });
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "connected",
          type: CrdtType.OBJECT,
          data: {},
        });
        // Orphan: parent doesn't exist
        corruptedNodesOnDisk.set("0:1", {
          parentId: "nonexistent",
          parentKey: "orphan",
          type: CrdtType.OBJECT,
          data: { orphaned: true },
        });
        // Another orphan: child of the first orphan
        corruptedNodesOnDisk.set("0:2", {
          parentId: "0:1",
          parentKey: "child",
          type: CrdtType.LIST,
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Orphans are excluded from in-memory view
              await assert(storage, [
                rootObj(),
                obj("0:0", {}, "root", "connected"),
              ]);
            });
          }
        );
      });

      test("loading storage removes node cycles as if the entire tree is orphaned", () => {
        // DOS-SQLite has a FK constraint (parent_id REFERENCES nodes(id)), so cycles
        // can't be created - inserting a node requires its parent to already exist.
        // This test only applies to backends without FK constraints.
        if (config.name === "dos-sqlite") return Promise.resolve();

        const corruptedNodesOnDisk: NodeMap = new Map();
        corruptedNodesOnDisk.set("root", {
          type: CrdtType.OBJECT,
          data: {},
        });
        corruptedNodesOnDisk.set("0:0", {
          parentId: "root",
          parentKey: "connected",
          type: CrdtType.OBJECT,
          data: {},
        });
        // Cycle: 0:1 -> 0:2 -> 0:3 -> 0:1
        corruptedNodesOnDisk.set("0:1", {
          parentId: "0:3", // 👈 Points to 0:3, forming a cycle
          parentKey: "a",
          type: CrdtType.OBJECT,
          data: {},
        });
        corruptedNodesOnDisk.set("0:2", {
          parentId: "0:1",
          parentKey: "b",
          type: CrdtType.OBJECT,
          data: {},
        });
        corruptedNodesOnDisk.set("0:3", {
          parentId: "0:2",
          parentKey: "c",
          type: CrdtType.OBJECT,
          data: {},
        });

        return runTest(
          { initialNodes: corruptedNodesOnDisk },
          async (driver) => {
            await runWithStorage(driver, async ({ storage }) => {
              // Cycles are unreachable from root, treated as orphans
              await assert(storage, [
                rootObj(),
                obj("0:0", {}, "root", "connected"),
              ]);
            });
          }
        );
      });
    });

    test("UpdateObject is a no-op on non-object nodes", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createObjectOp("0:1", "root", "o", { a: 0 }),
            createListOp("0:2", "root", "l"),
            createMapOp("0:3", "root", "m"),
            createRegisterOp("0:4", "0:3", "r", 42),
          ]);

          await assert(storage, [
            rootObj(),
            obj("0:1", { a: 0 }, "root", "o"),
            list("0:2", "root", "l"),
            map("0:3", "root", "m"),
            register("0:4", "0:3", "r", 42),
          ]);

          // Calling updateObjectOp on non-objects is a no-op...
          await storage.applyOps([updateObjectOp("0:0", { a: 1337 })]);
          await storage.applyOps([updateObjectOp("0:2", { a: 1337 })]);
          await storage.applyOps([updateObjectOp("0:3", { a: 1337 })]);
          await storage.applyOps([updateObjectOp("0:4", { a: 1337 })]);

          await assert(storage, [
            rootObj(),
            obj("0:1", { a: 0 }, "root", "o"),
            list("0:2", "root", "l"),
            map("0:3", "root", "m"),
            register("0:4", "0:3", "r", 42),
          ]);

          // ...but calling it on an object will not be
          await storage.applyOps([updateObjectOp("0:1", { a: 1337 })]);

          await assert(storage, [
            rootObj(),
            obj("0:1", { a: 1337 }, "root", "o"),
            list("0:2", "root", "l"),
            map("0:3", "root", "m"),
            register("0:4", "0:3", "r", 42),
          ]);
        });
      }));

    test("UpdateObject missing object should not create a new object", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([updateObjectOp("xxx", { a: 0 })]);

          await assert(storage, [rootObj()]);
        });
      }));

    test("UpdateObject single property with native value", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([updateObjectOp("root", { a: 0 })]);

          await assert(storage, [rootObj({ a: 0 })]);
        });
      }));

    test("UpdateObject remove child object recursively", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createObjectOp("0:1", "root", "child", { a: 0 }),
            createObjectOp("0:2", "0:1", "grandChild", { b: 0 }),
          ]);

          await assert(storage, [
            rootObj(),
            obj("0:1", { a: 0 }, "root", "child"),
            obj("0:2", { b: 0 }, "0:1", "grandChild"),
          ]);

          await storage.applyOps([updateObjectOp("root", { child: null })]);

          await assert(storage, [rootObj({ child: null })]);
        });
      }));

    test("UpdateObject can be used to update the root object", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await assert(storage, [rootObj()]);

          await storage.applyOps([updateObjectOp("root", { a: 0 })]);
          await assert(storage, [rootObj({ a: 0 })]);

          await storage.applyOps([deleteObjectKeyOp("root", "a")]);
          await assert(storage, [rootObj()]);
        });
      }));

    test("CreateRegister in map should remove previous one", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createMapOp("0:1", "root", "map"),
            createRegisterOp("0:2", "0:1", "boolean", true),
          ]);

          await assert(storage, [
            rootObj(),
            map("0:1", "root", "map"),
            register("0:2", "0:1", "boolean", true),
          ]);

          await storage.applyOps([
            createRegisterOp("0:3", "0:1", "boolean", false),
          ]);

          await assert(storage, [
            rootObj(),
            map("0:1", "root", "map"),
            register("0:3", "0:1", "boolean", false),
          ]);
        });
      }));

    test("CreateRegister inside a list", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([createListOp("0:0", "root", "items")]);

          const op = createRegisterOp("1:0", "0:0", FIRST_POSITION, "A");
          const result = await storage.applyOps([op]);

          expect(result).toEqual([{ action: "accepted", op }]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            register("1:0", "0:0", FIRST_POSITION, "A"),
          ]);
        });
      }));

    test("CreateRegister inside a list with a parent key that already exists should fix operation", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createRegisterOp("0:1", "0:0", FIRST_POSITION, "A"),
          ]);

          const inputOp = createRegisterOp("1:0", "0:0", FIRST_POSITION, "B");
          const result = await storage.applyOps([inputOp]);

          expect(result).toMatchObject([
            {
              action: "accepted",
              op: {
                ...inputOp,
                parentKey: SECOND_POSITION,
              },
              // NOTE: Fix ops are generated server-side and don't preserve the input opId
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.SET_PARENT_KEY,
                id: "1:0",
                parentKey: SECOND_POSITION,
              }),
            },
          ]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            register("0:1", "0:0", FIRST_POSITION, "A"),
            register("1:0", "0:0", SECOND_POSITION, "B"),
          ]);
        });
      }));

    test("CreateRegister inside a list with a parent key that already exists and set intent should replace existing child", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createRegisterOp("0:1", "0:0", FIRST_POSITION, "A"),
          ]);

          const op = createRegisterOp(
            "1:0",
            "0:0",
            FIRST_POSITION,
            "B",
            "set",
            "0:1"
          );
          const result = await storage.applyOps([op]);

          expect(result).toEqual([{ action: "accepted", op }]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            register("1:0", "0:0", FIRST_POSITION, "B"),
          ]);
        });
      }));

    test("CreateRegister inside a list with set intent should set it as child", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([createListOp("0:0", "root", "items")]);

          // Should only happen when a client has deleted a child while another client replace it with a set
          const op = createRegisterOp("1:0", "0:0", FIRST_POSITION, "B", "set");
          const result = await storage.applyOps([op]);

          expect(result).toEqual([{ action: "accepted", op }]);

          await assert(storage, [
            rootObj(),
            list("0:0", "root", "items"),
            register("1:0", "0:0", FIRST_POSITION, "B"),
          ]);
        });
      }));

    test("CreateRegister when register already exists should ignore op and not throw error", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createMapOp("0:0", "root", "map"),
            createRegisterOp("0:1", "0:0", "boolean", true),
          ]);

          await storage.applyOps([
            createRegisterOp("0:1", "0:0", "boolean", false),
          ]);

          await assert(storage, [
            rootObj(),
            map("0:0", "root", "map"),
            register("0:1", "0:0", "boolean", true),
          ]);
        });
      }));

    test("CreateRegister trying to add child nodes under a register is a no-op", () => {
      const nodesOnDisk: NodeMap = new Map([
        ["0:0", { type: CrdtType.LIST, parentId: "root", parentKey: "list" }],
        [
          "0:1",
          {
            type: CrdtType.REGISTER,
            parentId: "0:0",
            parentKey: "reg",
            data: 42,
          },
        ],
      ]);

      return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          const expectedNodes = [
            list("0:0", "root", "list"),
            register("0:1", "0:0", "reg", 42),
            rootObj(),
          ];
          await assert(storage, expectedNodes);

          await storage.applyOps([createObjectOp("0:2", "0:1", "obj", {})]);
          await assert(storage, expectedNodes);

          await storage.applyOps([createListOp("0:3", "0:1", "list")]);
          await assert(storage, expectedNodes);

          await storage.applyOps([createMapOp("0:4", "0:1", "map")]);
          await assert(storage, expectedNodes);

          await storage.applyOps([
            createRegisterOp("0:5", "0:1", "anotherreg", 1337),
          ]);
          await assert(storage, expectedNodes);
        });
      });
    });

    test("CreateMap in root", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([createMapOp("0:1", "root", "map")]);

          await assert(storage, [rootObj(), map("0:1", "root", "map")]);
        });
      }));

    test("CreateMap inside a list with a parent key that already exists should fix operation", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createMapOp("0:1", "0:0", FIRST_POSITION),
          ]);

          const inputOp = createMapOp("1:0", "0:0", FIRST_POSITION);
          const result = await storage.applyOps([inputOp]);

          expect(result).toMatchObject([
            {
              action: "accepted",
              op: {
                ...inputOp,
                parentKey: SECOND_POSITION,
              },
              // NOTE: Fix ops are generated server-side and don't preserve the input opId
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.SET_PARENT_KEY,
                id: "1:0",
                parentKey: SECOND_POSITION,
              }),
            },
          ]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            map("0:1", "0:0", FIRST_POSITION),
            map("1:0", "0:0", SECOND_POSITION),
          ]);
        });
      }));

    test("CreateMap inside a list with a parent key that already exists and set intent should replace existing child", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createMapOp("0:1", "0:0", FIRST_POSITION),
          ]);

          const op = createMapOp("1:0", "0:0", FIRST_POSITION, "set", "0:1");
          const result = await storage.applyOps([op]);

          expect(result).toEqual([{ action: "accepted", op }]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            map("1:0", "0:0", FIRST_POSITION),
          ]);
        });
      }));

    test("CreateMap when map already exists should ignore op and not throw error", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([createMapOp("0:1", "root", "map")]);
          await storage.applyOps([createMapOp("0:1", "root", "map")]);

          await assert(storage, [rootObj(), map("0:1", "root", "map")]);
        });
      }));

    test("SetParentKey changes positions of list items", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createRegisterOp("0:2", "0:1", FIRST_POSITION, "A"),
            createRegisterOp("0:3", "0:1", SECOND_POSITION, "B"),
          ]);

          const op = setParentKeyOp("0:2", THIRD_POSITION);

          const ops = await storage.applyOps([op]);

          expect(ops).toEqual([{ action: "accepted", op }]);
        });
      }));

    test("SetParentKey changes positions of list items (with conflict)", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createRegisterOp("0:2", "0:1", FIRST_POSITION, "A"),
            createRegisterOp("0:3", "0:1", SECOND_POSITION, "B"),
          ]);

          const inputOp = setParentKeyOp("0:2", SECOND_POSITION);
          const ops = await storage.applyOps([inputOp]);

          expect(ops).toMatchObject([
            {
              action: "accepted",
              op: {
                ...inputOp,
                parentKey: THIRD_POSITION,
              },
              // NOTE: Fix ops are generated server-side and don't preserve the input opId
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.SET_PARENT_KEY,
                id: "0:2",
                parentKey: THIRD_POSITION,
              }),
            },
          ]);
        });
      }));

    test("SetParentKey persists list item position changes to disk", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createRegisterOp("0:2", "0:1", FIRST_POSITION, "A"),
            createRegisterOp("0:3", "0:1", SECOND_POSITION, "B"),
          ]);

          // Move item from FIRST_POSITION to THIRD_POSITION
          await storage.applyOps([setParentKeyOp("0:2", THIRD_POSITION)]);

          // selfCheck verifies disk matches memory
          await selfCheck(storage);
        });
      }));

    test("SetParentKey is a no-op for all nodes that aren't list items", () =>
      fc.assert(
        fc.asyncProperty(
          arb
            .createOp({
              id: fc.constant("0:0"),
              parentId: fc.constant("root"),
              parentKey: fc.constant("items"),
            })
            // Skip generated nodes that are lists. We're interested in testing
            // non-list parents only here!
            .filter((op) => op.type !== OpCode.CREATE_LIST),

          async (parentNode) => {
            await runTest(async (driver) => {
              await runWithStorage(driver, async ({ storage }) => {
                await storage.applyOps([
                  parentNode,
                  createRegisterOp("0:2", parentNode.id, FIRST_POSITION, "A"),
                  createRegisterOp("0:3", parentNode.id, SECOND_POSITION, "B"),
                ]);

                const nodesBefore = getAll(storage);

                // The actual test: setParentKeyOp should be a no-op for all nodes
                // that aren't list child items
                const op = setParentKeyOp("0:2", THIRD_POSITION);
                const results = await storage.applyOps([op]);

                // Nothing should have changed!
                expect(getAll(storage)).toEqual(nodesBefore);
                expect(results.filter((r) => r.action !== "ignored")).toEqual(
                  []
                );
              });
            });
          }
        )
      ));

    test("SetParentKey preserves children when moving a list item", () => {
      // root -> items (list) -> item at index 0 (map with two children)
      const nodesOnDisk: NodeMap = new Map<string, SerializedCrdt>([
        list("0:1", "root", "items"),
        map("0:2", "0:1", FIRST_POSITION),
        register("0:3", "0:2", "a", "A"),
        register("0:4", "0:2", "b", "B"),
      ]);

      return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          // Move the map to a new position in the list
          const op = setParentKeyOp("0:2", SECOND_POSITION);
          await storage.applyOps([op]);

          // Verify the children where not deleted
          expect(storage.loadedDriver.get_node("0:3")).toEqual({
            type: CrdtType.REGISTER,
            parentId: "0:2",
            parentKey: "a",
            data: "A",
          });
          expect(storage.loadedDriver.get_node("0:4")).toEqual({
            type: CrdtType.REGISTER,
            parentId: "0:2",
            parentKey: "b",
            data: "B",
          });
        });
      });
    });

    test("CreateObject in root", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createObjectOp("0:1", "root", "child", { a: 0 }),
          ]);

          await assert(storage, [
            rootObj(),
            obj("0:1", { a: 0 }, "root", "child"),
          ]);
        });
      }));

    test("CreateObject in map", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([createMapOp("0:1", "root", "map")]);

          await assert(storage, [rootObj(), map("0:1", "root", "map")]);

          await storage.applyOps([
            createObjectOp("0:2", "0:1", "first", { a: 0 }),
          ]);

          await assert(storage, [
            rootObj(),
            map("0:1", "root", "map"),
            obj("0:2", { a: 0 }, "0:1", "first"),
          ]);
        });
      }));

    test("CreateObject should ignore op if parent does not exist", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          const result = await storage.applyOps([
            createObjectOp("1:0", "42:42", "item", {}),
          ]);

          await assert(storage, [rootObj()]);

          expect(result.filter((r) => r.action !== "ignored")).toEqual([]);
        });
      }));

    test("CreateObject inside a list with a parent key that already exists should fix operation", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createObjectOp("0:1", "0:0", FIRST_POSITION, {}),
          ]);

          const inputOp = createObjectOp("1:0", "0:0", FIRST_POSITION, {});
          const result = await storage.applyOps([inputOp]);

          expect(result).toMatchObject([
            {
              action: "accepted",
              op: {
                ...inputOp,
                parentKey: SECOND_POSITION,
              },
              // NOTE: Fix ops are generated server-side and don't preserve the input opId
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.SET_PARENT_KEY,
                id: "1:0",
                parentKey: SECOND_POSITION,
              }),
            },
          ]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            obj("0:1", {}, "0:0", FIRST_POSITION),
            obj("1:0", {}, "0:0", SECOND_POSITION),
          ]);
        });
      }));

    test("CreateObject inside a list with a parent key that already exists and set intent should replace existing child", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createObjectOp("0:1", "0:0", FIRST_POSITION, {}),
          ]);

          const op = createObjectOp(
            "1:0",
            "0:0",
            FIRST_POSITION,
            {},
            "set",
            "0:1"
          );
          const result = await storage.applyOps([op]);

          expect(result).toEqual([{ action: "accepted", op }]);

          expect(getAll(storage)).toEqual([
            [
              "root",
              {
                data: {},
                type: CrdtType.OBJECT,
              },
            ],
            [
              "0:0",
              {
                type: CrdtType.LIST,
                parentKey: "items",
                parentId: "root",
              },
            ],
            [
              "1:0",
              {
                type: CrdtType.OBJECT,
                parentKey: FIRST_POSITION,
                parentId: "0:0",
                data: {},
              },
            ],
          ]);
        });
      }));

    test("CreateObject inside a list with that matches multiple keys should modify the op with the right subsequent key", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createObjectOp("0:2", "0:1", FIRST_POSITION, {}),
            createObjectOp("0:3", "0:1", SECOND_POSITION, {}),
          ]);

          const inputOp = createObjectOp("1:0", "0:1", FIRST_POSITION, {});
          const result = await storage.applyOps([inputOp]);

          // The new expected position is in between the first and second positions
          const expectedPosition = makePosition(
            FIRST_POSITION,
            SECOND_POSITION
          );
          expect(result).toMatchObject([
            {
              action: "accepted",
              op: {
                ...inputOp,
                parentKey: expectedPosition,
              },
              // NOTE: Fix ops are generated server-side and don't preserve the input opId
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.SET_PARENT_KEY,
                id: "1:0",
                parentKey: expectedPosition,
              }),
            },
          ]);
        });
      }));

    test("DeleteObjectKey from root", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([updateObjectOp("root", { a: 0, b: 0 })]);

          await assert(storage, [rootObj({ a: 0, b: 0 })]);

          await storage.applyOps([deleteObjectKeyOp("root", "a")]);

          await assert(storage, [rootObj({ b: 0 })]);
        });
      }));

    test("DeleteObjectKey from object", () => {
      const nodesOnDisk: NodeMap = new Map();
      nodesOnDisk.set("0:1", {
        type: CrdtType.OBJECT,
        data: {},
        parentId: "root",
        parentKey: "o",
      });
      nodesOnDisk.set("0:2", {
        type: CrdtType.LIST,
        parentId: "0:1",
        parentKey: "x",
      });

      return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([deleteObjectKeyOp("0:1", "x")]);

          await assert(storage, [obj("0:1", {}, "root", "o"), rootObj()]);
        });
      });
    });

    test("DeleteCrdt with the root node is a no-op (virtual)", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createRegisterOp("0:2", "0:1", FIRST_POSITION, "A"),
          ]);

          const expectedNodes = [
            rootObj(),
            list("0:1", "root", "items"),
            register("0:2", "0:1", FIRST_POSITION, "A"),
          ];

          await assert(storage, expectedNodes);

          await storage.applyOps([deleteCrdtOp("root")]);
          await assert(storage, expectedNodes);
        });
      }));

    test("DeleteCrdt with the root node is a no-op (explicit)", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            updateObjectOp("root", { a: 1, b: 2 }),
            createListOp("0:1", "root", "items"),
            createRegisterOp("0:2", "0:1", FIRST_POSITION, "A"),
          ]);

          const expectedNodes = [
            rootObj({ a: 1, b: 2 }),
            list("0:1", "root", "items"),
            register("0:2", "0:1", FIRST_POSITION, "A"),
          ];

          await assert(storage, expectedNodes);

          await storage.applyOps([deleteCrdtOp("root")]);
          await assert(storage, expectedNodes);
        });
      }));

    test("DeleteCrdt should remove link", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createRegisterOp("0:2", "0:1", FIRST_POSITION, "A"),
          ]);

          await assert(storage, [
            rootObj(),
            list("0:1", "root", "items"),
            register("0:2", "0:1", FIRST_POSITION, "A"),
          ]);

          expect(countChildrenOf(storage, "0:1")).toBe(1);

          await storage.applyOps([deleteCrdtOp("0:2")]);

          await assert(storage, [rootObj(), list("0:1", "root", "items")]);
          expect(countChildrenOf(storage, "0:1")).toBe(0);
        });
      }));

    test("DeleteCrdt remove child records recursively with delete record", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:1", "root", "items"),
            createObjectOp("0:2", "0:1", FIRST_POSITION, {}),
            createObjectOp("0:3", "0:2", "child", { a: 0 }),
          ]);

          await assert(storage, [
            rootObj(),
            list("0:1", "root", "items"),
            obj("0:2", {}, "0:1", FIRST_POSITION),
            obj("0:3", { a: 0 }, "0:2", "child"),
          ]);

          expect(countChildrenOf(storage, "0:1")).toBe(1);
          expect(countChildrenOf(storage, "0:2")).toBe(1);

          await storage.applyOps([deleteCrdtOp("0:2")]);

          await assert(storage, [rootObj(), list("0:1", "root", "items")]);

          expect(countChildrenOf(storage, "0:1")).toBe(0);
          expect(countChildrenOf(storage, "0:2")).toBe(0);
        });
      }));

    test("DeleteCrdt remove multiple batch child records recursively with delete record", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          const ops: ClientWireOp[] = [
            createListOp("0:1", "root", "items"),
            createObjectOp("0:2", "0:1", FIRST_POSITION, {}),
          ];

          for (let i = 3; i < 150; i++) {
            ops.push(createObjectOp(`0:${i}`, "0:2", `child-${i}`, { a: 0 }));
          }

          await storage.applyOps(ops);

          await storage.applyOps([deleteCrdtOp("0:2")]);

          await assert(storage, [rootObj(), list("0:1", "root", "items")]);
        });
      }));

    test("CreateList when list already exists should ignore op and not throw error", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([createListOp("0:1", "root", "list")]);

          await storage.applyOps([createListOp("0:1", "root", "list")]);

          await assert(storage, [rootObj(), list("0:1", "root", "list")]);
        });
      }));

    test("CreateList inside a list with a parent key that already exists should fix operation", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createListOp("0:1", "0:0", FIRST_POSITION),
          ]);

          const inputOp = createListOp("1:0", "0:0", FIRST_POSITION);
          const result = await storage.applyOps([inputOp]);

          expect(result).toMatchObject([
            {
              action: "accepted",
              op: {
                ...inputOp,
                parentKey: SECOND_POSITION,
              },
              // NOTE: Fix ops are generated server-side and don't preserve the input opId
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.SET_PARENT_KEY,
                id: "1:0",
                parentKey: SECOND_POSITION,
              }),
            },
          ]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            list("0:1", "0:0", FIRST_POSITION),
            list("1:0", "0:0", SECOND_POSITION),
          ]);
        });
      }));

    test("CreateList inside a list with a parent key that already exists and set intent should replace existing child", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createListOp("0:1", "0:0", FIRST_POSITION),
          ]);

          const op = createListOp("1:0", "0:0", FIRST_POSITION, "set", "0:1");
          const result = await storage.applyOps([op]);

          expect(result).toEqual([{ action: "accepted", op }]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            list("1:0", "0:0", FIRST_POSITION),
          ]);
        });
      }));

    test("CreateList inside a list with a parent key that already exists and set intent should replace existing child (even if it got moved in the mean time)", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createListOp("0:0", "root", "items"),
            createListOp("0:1", "0:0", FIRST_POSITION),
            createListOp("0:2", "0:0", SECOND_POSITION),
          ]);

          // Simultaneous actions happen now:
          // - Client A moves stuff around in this list
          // - Client B tries to replace the item in first position with a new one

          // Client A
          await storage.applyOps([
            setParentKeyOp("0:1", THIRD_POSITION),
            setParentKeyOp("0:2", FIRST_POSITION),
          ]);

          // Client B
          const op = createListOp("0:3", "0:0", FIRST_POSITION, "set", "0:1");
          const result = await storage.applyOps([op]);

          expect(result).toMatchObject([
            {
              action: "accepted",
              op,

              //
              // NOTE:
              // This behavior is suboptimal, we know. Here, we inadvertently
              // delete both 0:1 and 0:2—instead of just 0:1 as one may expect!
              // This is an edge case that won't happen easily in production
              // though.
              //
              // What matters more, is _consistency_. Even when we have bad
              // behavior like this, what matters most is that it will behave
              // equally bad in the exact same way on all clients :)
              //
              // So... we can try to fix this behavior, but when we do, we should
              // make sure that it won't lead to two clients seeing different
              // state.
              //
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              fix: expect.objectContaining({
                type: OpCode.DELETE_CRDT,
                id: "0:2",
              }),
            },
          ]);

          expect(getAll(storage)).toEqual([
            rootObj(),
            list("0:0", "root", "items"),
            // list("0:2", "0:0", SECOND_POSITION),  👈 This note is also deleted, see note above
            list("0:3", "0:0", FIRST_POSITION),
          ]);
        });
      }));

    test("ensure execution order of Ops is well-defined", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          await storage.applyOps([
            createObjectOp("0:0", "root", "child", { a: 0 }),
            updateObjectOp("0:0", { a: 1 }),
            createObjectOp("0:1", "0:0", "a", { b: 0 }),
          ]);

          await assert(storage, [
            rootObj(),
            obj("0:0", {}, "root", "child"),
            obj("0:1", { b: 0 }, "0:0", "a"),
          ]);
        });
      }));

    // TODO: Generalize this into a property-based test stating that no
    // incoming Ops, ever, get ignored
    test("ensure no operations get ignored", () =>
      runTest(async (driver) => {
        await runWithStorage(driver, async ({ storage }) => {
          const result = await storage.applyOps([
            createMapOp("0:0", "root", "map"),
            createRegisterOp("0:1", "0:0", "first", 0),
            createRegisterOp("0:2", "0:0", "first", 1),
            createRegisterOp("0:3", "0:0", "first", 2),
          ]);

          expect(result.length).toBe(4);
        });
      }));

    describe("Known bugs found historically", () => {
      test("deletedId field cannot cause data corruption", () => {
        const nodesOnDisk: NodeMap = new Map([
          ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "a" }],
        ]);

        return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
          await runWithStorage(driver, async ({ storage }) => {
            await storage.applyOps([
              createListOp("0:2", "0:1", "b", "set"),
              createObjectOp("0:3", "0:2", "c", {}, "set", "0:1"),
              //                                           ^^^^^ 🔑
              //                          Incorrect value of deletedId here, but it
              //                             should not cause data corruption!
            ]);

            await selfCheck(storage);

            await assert(storage, [
              list("0:1", "root", "a"),
              rootObj(),
              list("0:2", "0:1", "b"),
              obj("0:3", {}, "0:2", "c"),
            ]);
          });
        });
      });

      test("data fields get wiped when adding child node under same key", () => {
        const nodesOnDisk: NodeMap = new Map([
          [
            "0:1",
            {
              type: CrdtType.OBJECT,
              parentId: "root",
              parentKey: "obj",
              data: { a: 1, b: 2, c: 3, d: 4, e: 5 }, // 👈 Note this data
            },
          ],
        ]);

        return runTest({ initialNodes: nodesOnDisk }, async (driver) => {
          await runWithStorage(driver, async ({ storage }) => {
            await assert(storage, [
              obj("0:1", { a: 1, b: 2, c: 3, d: 4, e: 5 }, "root", "obj"),
              rootObj(),
            ]);

            await storage.applyOps([
              createRegisterOp("0:2", "0:1", "a", "stuff"), // Register Op will get ignored because parent is object
              createObjectOp("0:3", "0:1", "b", {}),
              createListOp("0:4", "0:1", "c"),
              createMapOp("0:5", "0:1", "d"),
            ]);

            await assert(storage, [
              obj("0:1", { a: 1, e: 5 }, "root", "obj"),
              //         ^^^^^^^^^^^^^^ The overwritten fields should be gone
              rootObj(),
              obj("0:3", {}, "0:1", "b"),
              list("0:4", "0:1", "c"),
              map("0:5", "0:1", "d"),
            ]);

            // Which means that if we remove the children again...
            await storage.applyOps([
              deleteCrdtOp("0:2"),
              deleteCrdtOp("0:3"),
              deleteCrdtOp("0:4"),
              deleteCrdtOp("0:5"),
            ]);

            // ...the previously masked static fields become visible again to clients
            await assert(storage, [
              obj("0:1", { a: 1, e: 5 }, "root", "obj"),
              //         ^^^^^^^^^^^^^^ Still gone
              rootObj(),
            ]);
          });
        });
      });

      test("creating registers under objects is impossible", () =>
        runTest(async (driver) => {
          await runWithStorage(driver, async ({ storage }) => {
            await assert(storage, [rootObj()]);
            await selfCheck(storage);

            await storage.applyOps([createRegisterOp("0:0", "root", "a", 42)]); // 👈 Op should get ignored
            await selfCheck(storage);

            await assert(storage, [rootObj()]);
          });
        }));
    });
  });

  describe("YjsStorage behavior (high-level)", () => {
    async function runWithYjsStorage(
      driver: TDriver,
      yjsUpdates: Uint8Array[],
      callback: (arg: { yjsStorage: YjsStorage }) => Promise<void>
    ): Promise<void> {
      const guid: YDocId = "root";

      // Pre-populate with yjs updates if provided
      if (yjsUpdates.length > 0) {
        for (const update of yjsUpdates) {
          await driver.write_y_updates(guid, nanoid(), update);
        }
      }

      const yjsStorage = new YjsStorage(driver);

      // Load the root doc
      await yjsStorage.loadDocByIdIfNotAlreadyLoaded(guid);

      return await callback({ yjsStorage });
    }

    test("loading storage should return valid yjs doc", () =>
      runTest(async (driver) => {
        const update = getSampleYDocUpdate();
        await runWithYjsStorage(driver, [update], async ({ yjsStorage }) => {
          const loadedUpdate = await yjsStorage.getYDocUpdate(blackHole);
          if (loadedUpdate === null) {
            raise("could not load doc state update");
          }
          const doc2 = new Y.Doc();
          Y.applyUpdate(doc2, b64ToBytes(loadedUpdate));
          expect(doc2.getText("somedoc").toDelta()).toEqual([
            { insert: "a" },
            { insert: "bc", attributes: { bold: true } },
          ]);
        });
      }));

    test("loading storage should merge yjs updates", () =>
      runTest(async (driver) => {
        const doc = new Y.Doc();
        const ytext = doc.getText("somedoc");
        ytext.insert(0, "abc"); // insert three elements
        const update = Y.encodeStateAsUpdate(doc);
        ytext.format(1, 2, { bold: true });
        const update2 = Y.encodeStateAsUpdate(doc);
        ytext.insert(3, "def");
        const update3 = Y.encodeStateAsUpdate(doc);
        await runWithYjsStorage(
          driver,
          [update, update2, update3],
          async ({ yjsStorage }) => {
            const loadedUpdate = await yjsStorage.getYDocUpdate(blackHole);
            if (loadedUpdate === null) {
              raise("could not load doc state update");
            }
            const doc2 = new Y.Doc();
            Y.applyUpdate(doc2, b64ToBytes(loadedUpdate));
            expect(doc2.getText("somedoc").toDelta()).toEqual([
              { insert: "a" },
              { insert: "bcdef", attributes: { bold: true } },
            ]);
          }
        );
      }));

    test("ignore bad yjs updates", () =>
      runTest(async (driver) => {
        await runWithYjsStorage(driver, [], async ({ yjsStorage }) => {
          const update = getSampleYDocUpdate();
          await yjsStorage.addYDocUpdate(blackHole, bytesToB64(update));
          await expect(
            yjsStorage.addYDocUpdate(blackHole, "obviouslynotvalidbase64update")
          ).rejects.toThrow(
            "Bad YDoc update. Data is corrupted, or data does not match the encoding."
          );
          const loadedUpdate = await yjsStorage.getYDocUpdate(blackHole);
          const doc2 = new Y.Doc();
          Y.applyUpdate(doc2, b64ToBytes(loadedUpdate!));
          expect(doc2.getText("somedoc").toDelta()).toEqual([
            { insert: "a" },
            { insert: "bc", attributes: { bold: true } },
          ]);
        });
      }));

    test("loading and updating storage with v2 encoding", () =>
      runTest(async (driver) => {
        const update = getSampleYDocUpdate(true);
        await runWithYjsStorage(driver, [], async ({ yjsStorage }) => {
          await yjsStorage.addYDocUpdate(
            blackHole,
            bytesToB64(update),
            undefined,
            true // V2
          );
          const loadedUpdate = await yjsStorage.getYDocUpdate(
            blackHole,
            undefined,
            undefined,
            true // V2
          );
          if (loadedUpdate === null) {
            raise("could not load doc state update");
          }
          const doc2 = new Y.Doc();
          Y.applyUpdateV2(doc2, b64ToBytes(loadedUpdate));
          expect(doc2.getText("somedoc").toDelta()).toEqual([
            { insert: "a" },
            { insert: "bc", attributes: { bold: true } },
          ]);
        });
      }));

    test("loading storage should delete extra or duplicate data", () =>
      runTest(async (driver) => {
        const doc = new Y.Doc();
        const ytext = doc.getText("somedoc");
        ytext.insert(0, "abc");
        ytext.format(1, 2, { bold: true });
        const update = Y.encodeStateAsUpdate(doc);
        await runWithYjsStorage(
          driver,
          [update, update, update, update, update],
          async ({ yjsStorage }) => {
            const loadedUpdate = await yjsStorage.getYDocUpdate(blackHole);
            if (loadedUpdate === null) {
              raise("could not load doc state update");
            }
            const doc2 = new Y.Doc();
            Y.applyUpdate(doc2, b64ToBytes(loadedUpdate));
            expect(doc2.getText("somedoc").toDelta()).toEqual([
              { insert: "a" },
              { insert: "bc", attributes: { bold: true } },
            ]);
          }
        );
      }));

    test("loading storage should work with subdocument guid", () =>
      runTest(async (driver) => {
        await runWithYjsStorage(driver, [], async ({ yjsStorage }) => {
          const doc = new Y.Doc();
          const subdoc = new Y.Doc();
          const guid = subdoc.guid as Guid;
          doc.getMap().set("subdoc", subdoc);
          const ytext = subdoc.getText("somedoc");
          ytext.insert(0, "abc");
          ytext.format(1, 2, { bold: true });
          const docUpdate = Y.encodeStateAsUpdate(doc);
          const subdocUpdate = Y.encodeStateAsUpdate(subdoc);
          await yjsStorage.addYDocUpdate(blackHole, bytesToB64(docUpdate));
          await yjsStorage.addYDocUpdate(
            blackHole,
            bytesToB64(subdocUpdate),
            guid
          );
          const loadedUpdate = await yjsStorage.getYDocUpdate(
            blackHole,
            "",
            guid
          );
          if (loadedUpdate === null) {
            raise("could not load doc state update");
          }
          const subdoc2 = new Y.Doc();
          Y.applyUpdate(subdoc2, b64ToBytes(loadedUpdate));
          expect(subdoc2.getText("somedoc").toDelta()).toEqual([
            { insert: "a" },
            { insert: "bc", attributes: { bold: true } },
          ]);
        });
      }));
  });
}
