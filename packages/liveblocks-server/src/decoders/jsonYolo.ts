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
import type { Decoder } from "decoders";
import { unknown } from "decoders";

/**
 * Drop-in replacement for the `json` decoder from the decoders standard
 * library, but implemented as a no-op. This is, of course, only safe to use in
 * contexts where you know that the input already is valid JSON.
 *
 * You know this for sure, for example, if you're decoding the result of
 * a `JSON.parse()` call.
 *
 * Done for performance reasons!
 */
export const jsonYolo: Decoder<Json> = unknown as Decoder<Json>;

/**
 * Drop-in replacement for the `jsonObject` decoder from the decoders standard
 * library, but implemented as just a check for plain old JavaScript object.
 * This is, of course, only safe to use in contexts where you know that the
 * input already is valid JSON.
 *
 * You know this for sure, for example, if you're decoding the result of
 * a `JSON.parse()` call.
 *
 * Done for performance reasons!
 */
export const jsonObjectYolo: Decoder<JsonObject> = jsonYolo.refine(
  (value): value is JsonObject =>
    value !== null && typeof value === "object" && !Array.isArray(value),
  "Must be JSON object"
);
