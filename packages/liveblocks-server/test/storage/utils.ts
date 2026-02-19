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
  Json,
  JsonObject,
  ListStorageNode,
  MapStorageNode,
  NodeMap,
  NodeStream,
  ObjectStorageNode,
  RegisterStorageNode,
  SerializedCrdt,
  SerializedRootObject,
} from "@liveblocks/core";
import { CrdtType, OpCode } from "@liveblocks/core";

import type { Logger } from "~/lib/Logger";
import { makeNewInMemoryDriver } from "~/plugins/InMemoryDriver";
import type {
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateRegisterOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  SetParentKeyOp,
  UpdateObjectOp,
} from "~/protocol";
import { Storage } from "~/Storage";
import { selfCheck } from "~test/plugins/_generateFullTestSuite";

export function rootObj(data: JsonObject = {}): ["root", SerializedRootObject] {
  return ["root", { type: CrdtType.OBJECT, data }];
}

export function obj(
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
  return [
    id,
    {
      type: CrdtType.LIST,
      parentId,
      parentKey,
    },
  ];
}

export function map(
  id: string,
  parentId: string,
  parentKey: string
): MapStorageNode {
  return [
    id,
    {
      type: CrdtType.MAP,
      parentId,
      parentKey,
    },
  ];
}

export function register(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json
): RegisterStorageNode {
  return [
    id,
    {
      type: CrdtType.REGISTER,
      parentId,
      parentKey,
      data,
    },
  ];
}

export function updateObjectOp(
  id: string,
  data: Partial<JsonObject>
): UpdateObjectOp {
  return {
    type: OpCode.UPDATE_OBJECT,
    data,
    id,
  };
}

export function createObjectOp(
  id: string,
  parentId: string,
  parentKey: string,
  data: Partial<JsonObject>,
  intent?: "set",
  deletedId?: string
): CreateObjectOp {
  return {
    type: OpCode.CREATE_OBJECT,
    data,
    id,
    parentId,
    parentKey,
    intent,
    deletedId,
  };
}

export function createListOp(
  id: string,
  parentId: string,
  parentKey: string,
  intent?: "set",
  deletedId?: string
): CreateListOp {
  return {
    type: OpCode.CREATE_LIST,
    id,
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
  deletedId?: string
): CreateRegisterOp {
  return {
    type: OpCode.CREATE_REGISTER,
    id,
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
  opId?: string
): CreateMapOp {
  return {
    type: OpCode.CREATE_MAP,
    opId,
    id,
    parentId,
    parentKey,
    intent,
    deletedId,
  };
}

export function deleteCrdtOp(id: string, opId?: string): DeleteCrdtOp {
  return {
    type: OpCode.DELETE_CRDT,
    opId,
    id,
  };
}

export function setParentKeyOp(id: string, parentKey: string): SetParentKeyOp {
  return {
    id,
    type: OpCode.SET_PARENT_KEY,
    parentKey,
  };
}

export function deleteObjectKeyOp(id: string, key: string): DeleteObjectKeyOp {
  return {
    id,
    type: OpCode.DELETE_OBJECT_KEY,
    key,
  };
}

/**
 * Helper to create a Storage instance backed by the current driver. Writes
 * the initial nodes (which can contain invalid/corrupted data) to the
 * backend, then loads Storage on top.
 */
export async function runWithStorage<R>(
  nodeStream: NodeStream,
  callback: (arg: {
    storage: Storage;
    loadedDriver: Storage["loadedDriver"];
  }) => R | Promise<R>
): Promise<R> {
  const nodeMap: NodeMap = new Map<string, SerializedCrdt>(nodeStream);

  // Create the in-memory storage backend with initial data
  const backend = makeNewInMemoryDriver({ initialNodes: nodeMap });

  // Create the *access layer* around it (the API that we use)
  const storage = new Storage(backend);

  const logger = {
    warn: () => {},
    error: () => {},
  } as unknown as Logger;
  await storage.load(logger);

  // Also run an integrity check after initializing _corrupted_ storage.
  // Because the Storage class ignores any such corruptions, even when loading
  // corruptions the in-memory nodemap should be consistent.
  await selfCheck(storage);

  return callback({ storage, loadedDriver: storage.loadedDriver });
}
