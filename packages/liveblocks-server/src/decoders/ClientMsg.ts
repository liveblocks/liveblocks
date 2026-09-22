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
  jsonObject,
  nonEmptyString,
  number,
  object,
  optional,
  string,
  taggedUnion,
} from "decoders";

import type {
  AddFeedClientMsg,
  AddFeedMessageClientMsg,
  BroadcastEventClientMsg,
  ClientMsg,
  DeleteFeedClientMsg,
  DeleteFeedMessageClientMsg,
  FetchFeedMessagesClientMsg,
  FetchFeedsClientMsg,
  FetchStorageClientMsg,
  FetchYDocClientMsg,
  UpdateFeedClientMsg,
  UpdateFeedMessageClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
  UpdateYDocClientMsg,
} from "~/protocol";
import { FeedMsgCode } from "~/protocol";

import {
  feedMetadataUpdateDecoder,
  fetchFeedsMetadataFilterDecoder,
  optionalFeedMetadataDecoder,
} from "./feedMetadata";
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

// Feed message decoders
const fetchFeedsClientMsg: Decoder<FetchFeedsClientMsg> = object({
  type: constant(FeedMsgCode.FETCH_FEEDS),
  requestId: string,
  cursor: optional(string),
  since: optional(number),
  limit: optional(number),
  metadata: fetchFeedsMetadataFilterDecoder,
});

const fetchFeedMessagesClientMsg: Decoder<FetchFeedMessagesClientMsg> = object({
  type: constant(FeedMsgCode.FETCH_FEED_MESSAGES),
  requestId: string,
  feedId: nonEmptyString,
  cursor: optional(string),
  since: optional(number),
  limit: optional(number),
});

const addFeedClientMsg: Decoder<AddFeedClientMsg> = object({
  type: constant(FeedMsgCode.ADD_FEED),
  feedId: string,
  metadata: optionalFeedMetadataDecoder,
  timestamp: optional(number),
  requestId: optional(string),
});

const updateFeedClientMsg: Decoder<UpdateFeedClientMsg> = object({
  type: constant(FeedMsgCode.UPDATE_FEED),
  feedId: string,
  metadata: feedMetadataUpdateDecoder,
  requestId: optional(string),
});

const deleteFeedClientMsg: Decoder<DeleteFeedClientMsg> = object({
  type: constant(FeedMsgCode.DELETE_FEED),
  feedId: string,
  requestId: optional(string),
});

const addFeedMessageClientMsg: Decoder<AddFeedMessageClientMsg> = object({
  type: constant(FeedMsgCode.ADD_FEED_MESSAGE),
  feedId: string,
  data: jsonObject,
  id: optional(string),
  timestamp: optional(number),
  requestId: optional(string),
});

const updateFeedMessageClientMsg: Decoder<UpdateFeedMessageClientMsg> = object({
  type: constant(FeedMsgCode.UPDATE_FEED_MESSAGE),
  feedId: string,
  messageId: string,
  data: jsonObject,
  timestamp: optional(number),
  requestId: optional(string),
});

const deleteFeedMessageClientMsg: Decoder<DeleteFeedMessageClientMsg> = object({
  type: constant(FeedMsgCode.DELETE_FEED_MESSAGE),
  feedId: string,
  messageId: string,
  requestId: optional(string),
});

export const clientMsgDecoder: Decoder<ClientMsg<JsonObject, Json>> =
  taggedUnion("type", {
    [ClientMsgCode.UPDATE_PRESENCE]: updatePresenceClientMsg,
    [ClientMsgCode.BROADCAST_EVENT]: broadcastEventClientMsg,
    [ClientMsgCode.FETCH_STORAGE]: fetchStorageClientMsg,
    [ClientMsgCode.UPDATE_STORAGE]: updateStorageClientMsg,
    [ClientMsgCode.FETCH_YDOC]: fetchYDocClientMsg,
    [ClientMsgCode.UPDATE_YDOC]: updateYDocClientMsg,
    [FeedMsgCode.FETCH_FEEDS]: fetchFeedsClientMsg,
    [FeedMsgCode.FETCH_FEED_MESSAGES]: fetchFeedMessagesClientMsg,
    [FeedMsgCode.ADD_FEED]: addFeedClientMsg,
    [FeedMsgCode.UPDATE_FEED]: updateFeedClientMsg,
    [FeedMsgCode.DELETE_FEED]: deleteFeedClientMsg,
    [FeedMsgCode.ADD_FEED_MESSAGE]: addFeedMessageClientMsg,
    [FeedMsgCode.UPDATE_FEED_MESSAGE]: updateFeedMessageClientMsg,
    [FeedMsgCode.DELETE_FEED_MESSAGE]: deleteFeedMessageClientMsg,
  } as unknown as Record<
    string | number,
    Decoder<ClientMsg<JsonObject, Json>>
  >).describe("Must be a valid client message");

export const transientClientMsgDecoder: Decoder<ClientMsg<JsonObject, Json>> =
  taggedUnion("type", {
    // [ClientMsgCode.UPDATE_PRESENCE]: updatePresenceClientMsg,
    // [ClientMsgCode.BROADCAST_EVENT]: broadcastEventClientMsg,
    // [ClientMsgCode.FETCH_STORAGE]: fetchStorageClientMsg,
    [ClientMsgCode.UPDATE_STORAGE]: updateStorageClientMsg,
    // [ClientMsgCode.FETCH_YDOC]: fetchYDocClientMsg,
    // [ClientMsgCode.UPDATE_YDOC]: updateYDocClientMsg,
  }).describe("Must be a valid transient client message");
