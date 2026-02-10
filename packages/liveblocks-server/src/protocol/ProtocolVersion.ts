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

import { enum_ } from "decoders";

export enum ProtocolVersion {
  //
  // NOTE:
  // The following versions were once used, but there is no usage of it anymore
  // in the wild, so we've removed support for them:
  //
  //   V1 - Initial version
  //   V2 - ?
  //   V3 - started to broadcast storage operations to the sender to fix some
  //        conflicts
  //   V4 - created a virtual root to fix an issue where multiple people
  //        initialize the storage at the same time
  //   V5 - started to broadcast messages in a batch (arrays) for clients
  //   V6 - started to validate inputs with decoders.
  //

  /**
   * V7 changes the URL params used to authorize the user.
   *
   * In V6 and lower, the ?token= URL param is used, which will only ever
   * contain a `pub-legacy` or `sec-legacy` token.
   *
   * URL PARAM CHANGES:
   * Starting with V7, the ?token= is no longer a legal URL param. Instead,
   * either of the following params is used:
   *
   * - ?tok=... for ID tokens
   * - ?tok=... for Access tokens
   * - ?tok=... for Secret Legacy tokens
   * - ?pubkey=... for public keys (no token, public key can be directly used here)
   *
   * Note that `pub-legacy` tokens are no longer accepted in V7, and are
   * replaced by the direct use of the public key.
   *
   * BEHAVIORAL CHANGES:
   * Starting with V7, the RoomState server message that gets sent when
   * a client initially connects will now include new fields:
   *
   * - `actor`
   * - `scopes`
   *
   * Since v1.2.0 (Jul 31, 2023)
   */
  V7 = 7,

  /**
   * V8 changes storage response format and allows streaming.
   *
   * MESSAGE FORMAT CHANGES:
   * - V8: sends 1+ STORAGE_CHUNK messages, followed by 1 final
   *       STORAGE_STREAM_END message (with compact nodes)
   * - V7: sends 1 STORAGE_STATE_V7 message (with full nodes)
   *
   * STREAMING BEHAVIOR in V8:
   * - For SQLite-backed rooms: nodes are split into multiple STORAGE_CHUNK
   *   messages, followed by STORAGE_STREAM_END
   * - For KV-backed rooms: all nodes are sent in a single STORAGE_CHUNK
   *   message that will contain all nodes, followed by STORAGE_STREAM_END
   *
   * Since 3.14.0
   */
  V8 = 8,
}

export const protocolVersionDecoder = enum_(ProtocolVersion).describe(
  "Unsupported protocol version"
);
