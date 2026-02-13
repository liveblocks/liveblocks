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
import { json } from "@liveblocks/zenrouter";

/**
 * Make it obvious to callers that this is a dummy response, and that the
 * Liveblocks dev server not yet supports this endpoint for real.
 *
 * NOTE: The message is returned as a response header (X-LB-Dummy) visible to
 * the local developer using the dev server. This is intentional — it helps
 * them understand which endpoints are fully implemented vs stubbed.
 *
 * @param dummyKey - Optional uniqueness key sent as X-LB-Dummy-Key header.
 *   Allows the client to deduplicate warnings, so it can track which dummy
 *   responses it has already surfaced to the developer and only show new ones.
 */
export function DUMMY<J extends JsonObject>(
  data: J,
  status?: number | undefined,
  message = "This is a dummy response.",
  dummyKey?: string
): Response {
  const headers: HeadersInit = {};
  headers["X-LB-Dummy"] = message;
  if (dummyKey) headers["X-LB-Dummy-Key"] = dummyKey;
  return json(data, status, headers);
}

export function NOT_IMPLEMENTED(
  message = "This endpoint isn't implemented in the Liveblocks dev server (yet)"
): Response {
  return json(
    {
      error: "Not implemented",
      message,
      // TODO: Add link to docs explaining the roadmap and current set of
      // supported features
    },
    501
  );
}
