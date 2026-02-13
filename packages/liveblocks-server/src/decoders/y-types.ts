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

import type { Brand } from "@liveblocks/core";
import { uuid } from "decoders";

/**
 * A guid, a unique identifier for a Yjs sub document.
 */
export type Guid = Brand<string, "Guid">;

export const guidDecoder = uuid.refineType<Guid>();

export const ROOT_YDOC_ID = "root";
export type YDocId = typeof ROOT_YDOC_ID | Guid /* unique ID for subdoc */;

/**
 * Any string that is a valid base64 encoded YJS update.
 */
export type YUpdate = Brand<string, "YUpdate">;

/**
 * Any string that is a valid base64 encoded YJS state vector.
 */
export type YVector = Brand<string, "YVector">;
