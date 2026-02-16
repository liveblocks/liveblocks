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

import type { JsonObject } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { json } from "@liveblocks/zenrouter";

/**
 * Like `json()`, but also attaches X-LB-Warn and optional X-LB-Warn-Key
 * response headers.
 */
export function XWARN<J extends JsonObject>(
  data: J,
  status: number | undefined,
  message: string,
  warnKey?: string
): Response {
  const headers: HeadersInit = {};
  headers["X-LB-Warn"] = message;
  if (warnKey) headers["X-LB-Warn-Key"] = warnKey;
  return json(data, status, headers);
}

/**
 * Make it obvious to callers that this is a dummy response, and that the
 * Liveblocks dev server not yet supports this endpoint for real.
 *
 * NOTE: The message is returned as a response header (X-LB-Warn) visible to
 * the local developer using the dev server. This is intentional — it helps
 * them understand which endpoints are fully implemented vs stubbed.
 *
 * @param warnKey - Optional uniqueness key sent as X-LB-Warn-Key header.
 *   Allows the client to deduplicate warnings, so it can track which warnings
 *   it has already surfaced to the developer and only show new ones.
 */
export function DUMMY<J extends JsonObject>(
  data: J,
  status?: number | undefined,
  message = "This is a dummy response."
): Response {
  // Use a unique key so warnOnce doesn't deduplicate across different dummy
  // endpoints — each one should warn independently.
  return XWARN(data, status, message, nanoid());
}

export function NOT_IMPLEMENTED(
  message = "This endpoint isn't implemented in the Liveblocks dev server"
): Response {
  return json(
    {
      error: "Not implemented",
      message,
      // TODO: Add link to docs explaining the roadmap and current set of
      // supported features
    },
    501,
    { "X-LB-Warn": message }
  );
}
