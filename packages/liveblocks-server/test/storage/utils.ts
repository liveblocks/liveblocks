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
  NodeMap,
  NodeStream,
  RegisterStorageNode,
  SerializedCrdt,
  SerializedRootObject,
} from "@liveblocks/core";
import { CrdtType } from "@liveblocks/core";

import { makeNewInMemoryDriver } from "~/plugins/InMemoryDriver";
import { Storage } from "~/Storage";
import { selfCheck } from "~test/plugins/_generateFullTestSuite";

export function rootObj(data: JsonObject = {}): ["root", SerializedRootObject] {
  return ["root", { type: CrdtType.OBJECT, data }];
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

/**
 * Helper to create a Storage instance backed by the current driver. Writes
 * the initial nodes (which can contain invalid/corrupted data) to the
 * backend, then loads Storage on top.
 */
export function runWithStorage<R>(
  nodeStream: NodeStream,
  callback: (arg: {
    storage: Storage;
    driver: Storage["driver"];
  }) => R | Promise<R>
): Promise<R> {
  const nodeMap: NodeMap = new Map<string, SerializedCrdt>(nodeStream);

  // Create the in-memory storage backend with initial data
  const backend = makeNewInMemoryDriver({ initialNodes: nodeMap });

  // Create the *access layer* around it (the API that we use)
  const storage = new Storage(backend);

  // Also run an integrity check after initializing _corrupted_ storage.
  // Because the Storage class ignores any such corruptions, even when loading
  // corruptions the in-memory nodemap should be consistent.
  selfCheck(storage);

  return Promise.resolve(callback({ storage, driver: storage.driver }));
}
