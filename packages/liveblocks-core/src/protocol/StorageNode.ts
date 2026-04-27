import type { Json, JsonObject } from "../lib/Json";
import type { LiveTextDelta } from "./Op";

export type IdTuple<T> = [id: string, value: T];

export type CrdtType = (typeof CrdtType)[keyof typeof CrdtType];
export const CrdtType = Object.freeze({
  OBJECT: 0,
  LIST: 1,
  MAP: 2,
  REGISTER: 3,
  TEXT: 4,
});

export namespace CrdtType {
  export type OBJECT = typeof CrdtType.OBJECT;
  export type LIST = typeof CrdtType.LIST;
  export type MAP = typeof CrdtType.MAP;
  export type REGISTER = typeof CrdtType.REGISTER;
  export type TEXT = typeof CrdtType.TEXT;
}

export type SerializedCrdt = SerializedRootObject | SerializedChild;

export type SerializedChild =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister
  | SerializedText;

export type SerializedRootObject = {
  readonly type: CrdtType.OBJECT;
  readonly data: JsonObject;

  // Root objects don't have a parent relationship
  readonly parentId?: never;
  readonly parentKey?: never;
};

export type SerializedObject = {
  readonly type: CrdtType.OBJECT;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: JsonObject;
};

export type SerializedList = {
  readonly type: CrdtType.LIST;
  readonly parentId: string;
  readonly parentKey: string;
};

export type SerializedMap = {
  readonly type: CrdtType.MAP;
  readonly parentId: string;
  readonly parentKey: string;
};

export type SerializedRegister = {
  readonly type: CrdtType.REGISTER;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: Json;
};

export type SerializedText = {
  readonly type: CrdtType.TEXT;
  readonly parentId: string;
  readonly parentKey: string;
  readonly data: LiveTextDelta;
  readonly version: number;
};

export type StorageNode = RootStorageNode | ChildStorageNode;

export type ChildStorageNode =
  | ObjectStorageNode
  | ListStorageNode
  | MapStorageNode
  | RegisterStorageNode
  | TextStorageNode;

export type RootStorageNode = [id: "root", value: SerializedRootObject];
export type ObjectStorageNode = [id: string, value: SerializedObject];
export type ListStorageNode = [id: string, value: SerializedList];
export type MapStorageNode = [id: string, value: SerializedMap];
export type RegisterStorageNode = [id: string, value: SerializedRegister];
export type TextStorageNode = [id: string, value: SerializedText];

export type NodeMap = Map<string, SerializedCrdt>;
export type NodeStream = Iterable<StorageNode>;

export function isRootStorageNode(node: StorageNode): node is RootStorageNode {
  return node[0] === "root";
}

export function isObjectStorageNode(
  node: StorageNode
): node is RootStorageNode | ObjectStorageNode {
  return node[1].type === CrdtType.OBJECT;
}

export function isListStorageNode(node: StorageNode): node is ListStorageNode {
  return node[1].type === CrdtType.LIST;
}

export function isMapStorageNode(node: StorageNode): node is MapStorageNode {
  return node[1].type === CrdtType.MAP;
}

export function isRegisterStorageNode(
  node: StorageNode
): node is RegisterStorageNode {
  return node[1].type === CrdtType.REGISTER;
}

export function isTextStorageNode(node: StorageNode): node is TextStorageNode {
  return node[1].type === CrdtType.TEXT;
}

export type CompactNode = CompactRootNode | CompactChildNode;

export type CompactChildNode =
  | CompactObjectNode
  | CompactListNode
  | CompactMapNode
  | CompactRegisterNode
  | CompactTextNode;

export type CompactRootNode = readonly [id: "root", data: JsonObject];

export type CompactObjectNode = readonly [
  id: string,
  type: CrdtType.OBJECT,
  parentId: string,
  parentKey: string,
  data: JsonObject,
];

export type CompactListNode = readonly [
  id: string,
  type: CrdtType.LIST,
  parentId: string,
  parentKey: string,
];

export type CompactMapNode = readonly [
  id: string,
  type: CrdtType.MAP,
  parentId: string,
  parentKey: string,
];

export type CompactRegisterNode = readonly [
  id: string,
  type: CrdtType.REGISTER,
  parentId: string,
  parentKey: string,
  data: Json,
];

export type CompactTextNode = readonly [
  id: string,
  type: CrdtType.TEXT,
  parentId: string,
  parentKey: string,
  data: LiveTextDelta,
  version: number,
];

function isCompactRootNode(node: CompactNode): node is CompactRootNode {
  return node[0] === "root";
}

export function* compactNodesToNodeStream(
  compactNodes: CompactNode[]
): NodeStream {
  for (const cnode of compactNodes) {
    // Handle root nodes first - they have format ["root", data] where data is JsonObject
    if (isCompactRootNode(cnode)) {
      yield [cnode[0], { type: CrdtType.OBJECT, data: cnode[1] }];
      continue;
    }

    switch (cnode[1]) {
      case CrdtType.OBJECT:
        // prettier-ignore
        yield [cnode[0], { type: CrdtType.OBJECT, parentId: cnode[2], parentKey: cnode[3], data: cnode[4] }];
        break;
      case CrdtType.LIST:
        // prettier-ignore
        yield [cnode[0], { type: CrdtType.LIST, parentId: cnode[2], parentKey: cnode[3] }];
        break;
      case CrdtType.MAP:
        // prettier-ignore
        yield [cnode[0], { type: CrdtType.MAP, parentId: cnode[2], parentKey: cnode[3] }];
        break;
      case CrdtType.REGISTER:
        // prettier-ignore
        yield [cnode[0], {type: CrdtType.REGISTER, parentId: cnode[2], parentKey: cnode[3], data: cnode[4], }];
        break;
      case CrdtType.TEXT:
        // prettier-ignore
        yield [cnode[0], { type: CrdtType.TEXT, parentId: cnode[2], parentKey: cnode[3], data: cnode[4], version: cnode[5] }];
        break;
      default:
      // Ignore
    }
  }
}

export function* nodeStreamToCompactNodes(
  nodes: NodeStream
): Iterable<CompactNode> {
  for (const node of nodes) {
    if (isObjectStorageNode(node)) {
      if (isRootStorageNode(node)) {
        const id = node[0];
        const crdt = node[1];
        yield [id, crdt.data];
      } else {
        const id = node[0];
        const crdt = node[1];
        yield [id, CrdtType.OBJECT, crdt.parentId, crdt.parentKey, crdt.data];
      }
    } else if (isListStorageNode(node)) {
      const id = node[0];
      const crdt = node[1];
      yield [id, CrdtType.LIST, crdt.parentId, crdt.parentKey];
    } else if (isMapStorageNode(node)) {
      const id = node[0];
      const crdt = node[1];
      yield [id, CrdtType.MAP, crdt.parentId, crdt.parentKey];
    } else if (isRegisterStorageNode(node)) {
      const id = node[0];
      const crdt = node[1];
      yield [id, CrdtType.REGISTER, crdt.parentId, crdt.parentKey, crdt.data];
    } else if (isTextStorageNode(node)) {
      const id = node[0];
      const crdt = node[1];
      yield [
        id,
        CrdtType.TEXT,
        crdt.parentId,
        crdt.parentKey,
        crdt.data,
        crdt.version,
      ];
    } else {
      // Ignore
    }
  }
}
