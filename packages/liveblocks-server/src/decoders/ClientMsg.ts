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
import { ClientMsgCode } from "@liveblocks/core";
import type { Decoder } from "decoders";
import {
  array,
  boolean,
  constant,
  number,
  object,
  optional,
  string,
  taggedUnion,
} from "decoders";

import type {
  BroadcastEventClientMsg,
  ClientMsg,
  FetchStorageClientMsg,
  FetchYDocClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
  UpdateYDocClientMsg,
} from "~/protocol";

import { jsonObjectYolo, jsonYolo } from "./jsonYolo";
import { op } from "./Op";
import type { YUpdate, YVector } from "./y-types";
import { guidDecoder } from "./y-types";

const updatePresenceClientMsg: Decoder<UpdatePresenceClientMsg<JsonObject>> =
  object({
    type: constant(ClientMsgCode.UPDATE_PRESENCE),
    data: jsonObjectYolo,
    targetActor: optional(number),
  });

const broadcastEventClientMsg: Decoder<BroadcastEventClientMsg<Json>> = object({
  type: constant(ClientMsgCode.BROADCAST_EVENT),
  event: jsonYolo,
});

const fetchStorageClientMsg: Decoder<FetchStorageClientMsg> = object({
  type: constant(ClientMsgCode.FETCH_STORAGE),
});

const updateStorageClientMsg: Decoder<UpdateStorageClientMsg> = object({
  type: constant(ClientMsgCode.UPDATE_STORAGE),
  ops: array(op),
});

const fetchYDocClientMsg: Decoder<FetchYDocClientMsg> = object({
  type: constant(ClientMsgCode.FETCH_YDOC),
  vector: string.refineType<YVector>(),
  guid: optional(guidDecoder), // Don't specify to update the root doc
  v2: optional(boolean),
});

const updateYDocClientMsg: Decoder<UpdateYDocClientMsg> = object({
  type: constant(ClientMsgCode.UPDATE_YDOC),
  update: string.refineType<YUpdate>(),
  guid: optional(guidDecoder), // Don't specify to update the root doc
  v2: optional(boolean),
});

export const clientMsgDecoder: Decoder<ClientMsg<JsonObject, Json>> =
  taggedUnion("type", {
    [ClientMsgCode.UPDATE_PRESENCE]: updatePresenceClientMsg,
    [ClientMsgCode.BROADCAST_EVENT]: broadcastEventClientMsg,
    [ClientMsgCode.FETCH_STORAGE]: fetchStorageClientMsg,
    [ClientMsgCode.UPDATE_STORAGE]: updateStorageClientMsg,
    [ClientMsgCode.FETCH_YDOC]: fetchYDocClientMsg,
    [ClientMsgCode.UPDATE_YDOC]: updateYDocClientMsg,
  }).describe("Must be a valid client message");

export const transientClientMsgDecoder: Decoder<ClientMsg<JsonObject, Json>> =
  taggedUnion("type", {
    // [ClientMsgCode.UPDATE_PRESENCE]: updatePresenceClientMsg,
    // [ClientMsgCode.BROADCAST_EVENT]: broadcastEventClientMsg,
    // [ClientMsgCode.FETCH_STORAGE]: fetchStorageClientMsg,
    [ClientMsgCode.UPDATE_STORAGE]: updateStorageClientMsg,
    // [ClientMsgCode.FETCH_YDOC]: fetchYDocClientMsg,
    // [ClientMsgCode.UPDATE_YDOC]: updateYDocClientMsg,
  }).describe("Must be a valid transient client message");
