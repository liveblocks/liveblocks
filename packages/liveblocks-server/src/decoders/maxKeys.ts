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

import type { Decoder } from "decoders";

/**
 * Rejects records with more than `max` keys.
 *
 * TODO: We may want to move this into the decoders library eventually (e.g.
 * as `sized()` support for records), but not now.
 */
export function maxKeys<T extends Record<string, unknown>>(
  decoder: Decoder<T>,
  max: number
): Decoder<T> {
  // Same wording as decoders' sized()
  return decoder.refine(
    (value) => Object.keys(value).length <= max,
    `Must have at most ${max} ${max === 1 ? "item" : "items"}`
  );
}
