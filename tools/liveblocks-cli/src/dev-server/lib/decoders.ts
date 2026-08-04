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

import type { IUserInfo } from "@liveblocks/core";
import type { Decoder } from "decoders";
import {
  array,
  inexact,
  optional,
  regex,
  sized,
  startsWith,
  string,
} from "decoders";

// Mirrors `storageFileIdDecoder` in @shared/common, which isn't reachable from
// here: that package is backend-only and this one is mirrored to the public
// repo. The shape is "fl_" plus 21 nanoid characters.
export const storageFileId = sized(startsWith("fl_"), { size: 24 });

export const storageFileIds = array(storageFileId).refine(
  (value) => value.length <= 500,
  "Too many file ids, max 500"
);

// Multipart upload ids are minted by the blob store as UUIDs. Unlike a real
// object store, which treats them as opaque tokens, the dev server's
// filesystem store turns them into a directory name — so what the URL says has
// to be checked before it gets anywhere near a path.
export const uploadId = regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Must be a valid upload id"
);

// A IUserInfo shape is any JSON object, but with the only requirement that
// `name` and `avatar` keys are strings (if present).
export const userInfo: Decoder<IUserInfo> = inexact({
  name: optional(string),
  avatar: optional(string),
}).refineType<IUserInfo>();
