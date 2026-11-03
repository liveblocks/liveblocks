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

import { natural } from "decoders";

/**
 * A livefile's byte count, as it arrives on the wire: from a CREATE_FILE op,
 * from a whole document being installed at once, or from the upload
 * notification itself.
 */
// TODO Remove this .refine() once isSafeInteger is the default check for natural
export const fileSize = natural.refine(
  Number.isSafeInteger,
  "Must be a valid file size"
);

/**
 * A LiveText node's version counter.
 */
// TODO Remove this .refine() once isSafeInteger is the default check for natural
export const liveTextVersion = natural.refine(
  Number.isSafeInteger,
  "Must be a safe integer"
);
