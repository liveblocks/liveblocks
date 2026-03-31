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
 * NOTE: this will be moved to @liveblocks/core in the future.
 * Feed WebSocket message codes.
 * 50x = server → client, 51x = client → server.
 */
export const FeedMsgCode = {
  // Server → client (50x)
  FEEDS_LIST: 500,
  FEEDS_ADDED: 501,
  FEEDS_UPDATED: 502,
  FEED_DELETED: 503,
  FEED_MESSAGES_LIST: 504,
  FEED_MESSAGES_ADDED: 505,
  FEED_MESSAGES_UPDATED: 506,
  FEED_MESSAGES_DELETED: 507,
  FEED_REQUEST_FAILED: 508,
  // Client → server (51x)
  FETCH_FEEDS: 510,
  FETCH_FEED_MESSAGES: 511,
  ADD_FEED: 512,
  UPDATE_FEED: 513,
  DELETE_FEED: 514,
  ADD_FEED_MESSAGE: 515,
  UPDATE_FEED_MESSAGE: 516,
  DELETE_FEED_MESSAGE: 517,
} as const;

/** Error codes for {@link FeedRequestFailedServerMsg}. */
export const FeedRequestErrorCode = {
  INTERNAL: "INTERNAL",
  FEED_ALREADY_EXISTS: "FEED_ALREADY_EXISTS",
  FEED_NOT_FOUND: "FEED_NOT_FOUND",
  FEED_MESSAGE_NOT_FOUND: "FEED_MESSAGE_NOT_FOUND",
} as const;

import type { JsonObject } from "@liveblocks/core";

import type { Feed, FeedMessage } from "../types";

// ─── Server messages (50x) ───────────────────────────────────────────────────

export type FeedsListServerMsg = {
  type: 500;
  requestId: string;
  feeds: Feed[];
  nextCursor?: string;
};

export type FeedsAddedServerMsg = {
  type: 501;
  feeds: Feed[];
};

export type FeedsUpdatedServerMsg = {
  type: 502;
  feeds: Feed[];
};

export type FeedDeletedServerMsg = {
  type: 503;
  feedId: string;
};

export type FeedRequestFailedServerMsg = {
  type: 508;
  requestId: string;
  code: string;
  reason?: string;
};

export type FeedsServerMsg =
  | FeedsListServerMsg
  | FeedsAddedServerMsg
  | FeedsUpdatedServerMsg
  | FeedDeletedServerMsg
  | FeedRequestFailedServerMsg;

export type FeedMessagesListServerMsg = {
  type: 504;
  requestId: string;
  feedId: string;
  messages: FeedMessage[];
  nextCursor?: string;
};

export type FeedMessagesAddedServerMsg = {
  type: 505;
  feedId: string;
  messages: FeedMessage[];
};

export type FeedMessagesUpdatedServerMsg = {
  type: 506;
  feedId: string;
  messages: FeedMessage[];
};

export type FeedMessagesDeletedServerMsg = {
  type: 507;
  feedId: string;
  messageIds: string[];
};

export type FeedMessagesServerMsg =
  | FeedMessagesListServerMsg
  | FeedMessagesAddedServerMsg
  | FeedMessagesUpdatedServerMsg
  | FeedMessagesDeletedServerMsg
  | FeedRequestFailedServerMsg;

// ─── Client messages (51x) ───────────────────────────────────────────────────

export type FetchFeedsClientMsg = {
  type: 510;
  requestId: string;
  cursor?: string;
  since?: number;
  limit?: number;
  /** Match feeds whose metadata contains these keys (same value rules as room metadata updates). */
  metadata?: Record<string, string | string[] | null>;
};

export type FetchFeedMessagesClientMsg = {
  type: 511;
  requestId: string;
  feedId: string;
  cursor?: string;
  since?: number;
  limit?: number;
};

export type AddFeedClientMsg = {
  type: 512;
  feedId: string;
  metadata?: Record<string, string[] | string>;
  timestamp?: number;
  requestId?: string;
};

export type UpdateFeedClientMsg = {
  type: 513;
  feedId: string;
  metadata: Record<string, string[] | string | null>;
  requestId?: string;
};

export type DeleteFeedClientMsg = {
  type: 514;
  feedId: string;
  requestId?: string;
};

export type AddFeedMessageClientMsg = {
  type: 515;
  feedId: string;
  data: JsonObject;
  id?: string;
  timestamp?: number;
  requestId?: string;
};

export type UpdateFeedMessageClientMsg = {
  type: 516;
  feedId: string;
  messageId: string;
  data: JsonObject;
  timestamp?: number;
  requestId?: string;
};

export type DeleteFeedMessageClientMsg = {
  type: 517;
  feedId: string;
  messageId: string;
  requestId?: string;
};
