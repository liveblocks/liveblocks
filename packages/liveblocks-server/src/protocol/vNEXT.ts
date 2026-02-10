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
 * [Document the purpose of this module here.]
 * [Purpose = to have a place to change the types for iterating on new protocol versions]
 */

// All ClientMsg types
export type {
  BroadcastEventClientMsg,
  ClientMsg,
  FetchStorageClientMsg,
  FetchYDocClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
  UpdateYDocClientMsg,
} from "@liveblocks/core";

// All ServerMsg types
export type { RoomStateServerMsg, ServerMsg } from "@liveblocks/core";

// All Op types
export type {
  ClientWireOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateOp,
  CreateRegisterOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  HasOpId,
  IgnoredOp,
  Op,
  ServerWireOp,
  SetParentKeyOp,
  UpdateObjectOp,
} from "@liveblocks/core";
