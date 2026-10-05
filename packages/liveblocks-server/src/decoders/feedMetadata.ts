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
 * Feed metadata decoders — same rules as room/thread metadata (see @shared/common
 * createMetadataDecoder / updateRoomMetadataDecoder).
 */

import type { Decoder } from "decoders";
import {
  array,
  either,
  identifier,
  nullable,
  optional,
  poja,
  record,
  select,
  sized,
  string,
} from "decoders";

import { maxKeys } from "./maxKeys";

/** Same cap as createMetadataDecoder in @shared/common */
const MAX_METADATA_COUNT = 50;

export const feedMetadataIdDecoder = sized(identifier, { min: 1, max: 40 });

const metadataStringValue = sized(string, { max: 256 });

function createRoomMetadataValueDecoder(): Decoder<string | string[]> {
  const listOfStrings = array(metadataStringValue, { max: 50 });
  return select(
    either(string, poja).describe("Must be string or string[]"),
    (x) => (typeof x === "string" ? metadataStringValue : listOfStrings)
  );
}

const roomMetadataValueDecoder = createRoomMetadataValueDecoder();

/**
 * A single metadata value: string, string[], or null (null clears a key on update).
 */
const feedMetadataNullableValueDecoder = nullable(roomMetadataValueDecoder);

const feedMetadataRecordForCreate = maxKeys(
  record(feedMetadataIdDecoder, roomMetadataValueDecoder),
  MAX_METADATA_COUNT
);

/**
 * Optional feed metadata on create (WebSocket ADD_FEED, HTTP POST …/feeds).
 * Same rules as createMetadataDecoder / room metadata on create (no null values).
 */
export const optionalFeedMetadataDecoder = optional(
  feedMetadataRecordForCreate
);

/**
 * Full metadata object for update (WebSocket UPDATE_FEED, HTTP PATCH …/feeds/:id).
 * Same shape as updateRoomMetadataDecoder.
 */
export const feedMetadataUpdateDecoder = record(
  feedMetadataIdDecoder,
  feedMetadataNullableValueDecoder
);

const feedMetadataRecordForFilter = maxKeys(
  record(feedMetadataIdDecoder, feedMetadataNullableValueDecoder),
  MAX_METADATA_COUNT
);

/**
 * Optional metadata filter for FETCH_FEEDS — same key/value rules as
 * {@link feedMetadataUpdateDecoder} / updateRoomMetadataDecoder in @shared/common.
 */
export const fetchFeedsMetadataFilterDecoder = optional(
  feedMetadataRecordForFilter
);
