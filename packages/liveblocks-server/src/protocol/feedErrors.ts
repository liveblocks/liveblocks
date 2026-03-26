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

import {
  FeedMsgCode,
  FeedRequestErrorCode,
  type FeedRequestFailedServerMsg,
} from "./feedMessages";

export function feedRequestFailed(
  requestId: string | undefined,
  code: string,
  reason?: string
): FeedRequestFailedServerMsg {
  return {
    type: FeedMsgCode.FEED_REQUEST_FAILED,
    requestId: requestId ?? "",
    code,
    reason,
  };
}

/**
 * Maps driver / Room errors to stable {@link FeedRequestFailedServerMsg} codes.
 * Prefer matching known {@link Error#message} shapes storage drivers.
 */
export function mapFeedError(err: unknown): { code: string; reason?: string } {
  if (!(err instanceof Error)) {
    return { code: FeedRequestErrorCode.INTERNAL };
  }

  const m = err.message;

  if (m.includes("already exists")) {
    return { code: FeedRequestErrorCode.FEED_ALREADY_EXISTS, reason: m };
  }

  if (m.includes("Feed message") && m.includes("not found")) {
    return { code: FeedRequestErrorCode.FEED_MESSAGE_NOT_FOUND, reason: m };
  }

  if (m.includes("not found")) {
    return { code: FeedRequestErrorCode.FEED_NOT_FOUND, reason: m };
  }

  return { code: FeedRequestErrorCode.INTERNAL, reason: m };
}

/** Maps an arbitrary thrown value to a {@link FeedRequestFailedServerMsg}. */
export function feedFailureServerMsg(
  requestId: string | undefined,
  err: unknown
): FeedRequestFailedServerMsg {
  const mapped = mapFeedError(err);
  return feedRequestFailed(requestId, mapped.code, mapped.reason);
}
