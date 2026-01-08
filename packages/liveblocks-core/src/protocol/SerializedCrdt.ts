import type { Json, JsonObject } from "../lib/Json";

export type IdTuple<T> = [id: string, value: T];

export type CrdtType = (typeof CrdtType)[keyof typeof CrdtType];
export const CrdtType = Object.freeze({
  OBJECT: 0,
  LIST: 1,
  MAP: 2,
  REGISTER: 3,
});

export namespace CrdtType {
  export type OBJECT = typeof CrdtType.OBJECT;
  export type LIST = typeof CrdtType.LIST;
  export type MAP = typeof CrdtType.MAP;
  export type REGISTER = typeof CrdtType.REGISTER;
}

export type SerializedCrdt = SerializedRootObject | SerializedChild;

export type SerializedChild =
  | SerializedObject
  | SerializedList
  | SerializedMap
  | SerializedRegister;

export type NodeStream = Iterable<IdTuple<SerializedCrdt>>;

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

export type CompactNode = CompactRootNode | CompactChildNode;

export type CompactChildNode =
  | CompactObjectNode
  | CompactListNode
  | CompactMapNode
  | CompactRegisterNode;

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

function isRootNode(node: CompactNode): node is CompactRootNode {
  return node[0] === "root";
}

function isRootCrdt(id: string, _: SerializedCrdt): _ is SerializedRootObject {
  return id === "root";
}

export function* compactNodesToNodeStream(nodes: CompactNode[]): NodeStream {
  for (const node of nodes) {
    const id = node[0];
    if (isRootNode(node)) {
      yield [id, { type: CrdtType.OBJECT, data: node[1] }];
      continue;
    }
    switch (node[1]) {
      case CrdtType.OBJECT:
        // prettier-ignore
        yield [id, { type: CrdtType.OBJECT, parentId: node[2], parentKey: node[3], data: node[4] }];
        break;
      case CrdtType.LIST:
        // prettier-ignore
        yield [id, { type: CrdtType.LIST, parentId: node[2], parentKey: node[3] }];
        break;
      case CrdtType.MAP:
        // prettier-ignore
        yield [id, { type: CrdtType.MAP, parentId: node[2], parentKey: node[3] }];
        break;
      case CrdtType.REGISTER:
        // prettier-ignore
        yield [id, {type: CrdtType.REGISTER, parentId: node[2], parentKey: node[3], data: node[4], }];
        break;
    }
  }
}

export function* nodeStreamToCompactNodes(
  nodes: NodeStream
): Iterable<CompactNode> {
  for (const [id, node] of nodes) {
    switch (node.type) {
      case CrdtType.OBJECT:
        if (isRootCrdt(id, node)) {
          yield [id, node.data] as CompactRootNode;
        } else {
          yield [id, CrdtType.OBJECT, node.parentId, node.parentKey, node.data];
        }
        break;
      case CrdtType.LIST:
        // prettier-ignore
        yield [id, CrdtType.LIST, node.parentId, node.parentKey] as CompactListNode;
        break;
      case CrdtType.MAP:
        // prettier-ignore
        yield [id, CrdtType.MAP, node.parentId, node.parentKey] as CompactMapNode;
        break;
      case CrdtType.REGISTER:
        // prettier-ignore
        yield [id, CrdtType.REGISTER, node.parentId, node.parentKey, node.data] as CompactRegisterNode;
        break;
    }
  }
}
