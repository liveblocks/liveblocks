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

import type { DistributiveOmit } from "@liveblocks/core";
import { nanoid, tryParseJson } from "@liveblocks/core";
import type { DecoderType } from "decoders";
import {
  array,
  constant,
  enum_,
  number,
  object,
  optional,
  record,
  string,
  taggedUnion,
} from "decoders";

import { userInfo } from "./decoders";
import { Permission } from "./permissions";

const unsignedJwtHeader = object({
  alg: constant("none"),
});

const liteAccessToken = object({
  k: constant("acc"),
  pid: constant("localdev"),
  uid: string,
  ui: optional(userInfo),
  perms: record(array(enum_(Permission))),
  exp: number,
});

const liteIdToken = object({
  k: constant("id"),
  pid: constant("localdev"),
  uid: string,
  ui: optional(userInfo),
  gids: optional(array(string)),
  exp: number,
});

const liteToken = taggedUnion("k", {
  acc: liteAccessToken,
  id: liteIdToken,
});

export type LiteAccessToken = DecoderType<typeof liteAccessToken>;
export type LiteIdToken = DecoderType<typeof liteIdToken>;
export type LiteToken = DecoderType<typeof liteToken>;

// Input type for createJwtLite (exp is added automatically)
export type LiteTokenInput = DistributiveOmit<LiteToken, "exp">;

// Simple base64url encoding (no padding)
function base64Encode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Simple base64url decoding
function base64Decode(str: string): string {
  // Restore standard base64 characters and padding
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Creates a JWT-lite token. These are structurally valid JWTs but use
 * "alg: none" (no cryptographic signature). For local development only.
 * Always sets pid to 'localdev'.
 */
export function createJwtLite(info: LiteTokenInput): string {
  const nowSecs = Math.floor(Date.now() / 1000);
  const payload = {
    ...info,
    iat: nowSecs,
    exp: nowSecs + 60 * 60, // 1 hour
    jti: nanoid(12),
  };
  const headerB64 = base64Encode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payloadB64 = base64Encode(JSON.stringify(payload));
  const signature = ""; // Empty signature is valid for "alg: none"
  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a JWT-lite token. These are structurally valid JWTs
 * but use "alg: none" (no cryptographic signature). For local development only.
 * Only accepts tokens with pid 'localdev'.
 * Returns the payload if valid, null otherwise.
 */
export function verifyJwtLite(token: string): LiteToken | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;

  // Verify it's an unsigned token (alg: none)
  if (signature !== "") return null; // Signature must be empty for alg: none
  if (!unsignedJwtHeader.value(tryParseJson(base64Decode(headerB64))))
    return null;

  // Decode and validate payload using the decoder
  const payload = liteToken.value(tryParseJson(base64Decode(payloadB64)));
  if (!payload) return null;

  // Check expiration
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
