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

import { nanoid } from "@liveblocks/core";

// TODO Reinstate URL-unsafe characters (`/`, `+`, `?`) like the production
// helpers in our real production app. Doing so requires the dev-server test
// callers to URL-encode `roomId` when interpolating into paths, and the
// dev-server router to correctly decode the result.
export function makeExternalRoomId(): string {
  return `room-${nanoid()}`;
}
