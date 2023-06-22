import type { Json } from "../lib/Json";
import { b64decode, isPlainObject, tryParseJson } from "../lib/utils";

export enum RoomScope {
  Read = "room:read",
  Write = "room:write",
  PresenceWrite = "room:presence:write",
}

/**
 * Fields of the JWT payload that the client relies on and interprets. There
 * exist more fields in the JWT payload, but those aren't needed by the client
 * directly, and simply passed back to the backend.
 *
 * This type should only list the properties that client uses, so we're still
 * free to change the other fields on the token without breaking backward
 * compatibility.
 *
 * @internal For unit tests only.
 */
export type MinimalTokenPayload = {
  // IMPORTANT: All other fields on the JWT token are deliberately treated as
  // opaque, and not relied on by the client.
  [other: string]: Json | undefined;

  // Issued at and expiry fields (from JWT spec)
  iat: number;
  exp: number;

  // XXX Try to remove as many fields below from this type as possible
  appId: string;
  roomId: string; // Discriminating field for AuthToken type
  scopes: string[]; // Think Scope[], but it could also hold scopes from the future, hence string[]
  actor: number;
  maxConnectionsPerRoom?: number;

  // Extra payload as defined by the customer's own authorization
  info?: Json;
  groupIds?: string[];
} & ({ id: string; anonymousId?: never } | { id?: never; anonymousId: string });

// The "rich" token is data we obtain by parsing the JWT token and making all
// metadata on it accessible. It's done right after hitting the backend, but
// before the promise will get returned, so it's an inherent part of the
// authentication step.
// XXX Rename to ParsedAuthToken?
export type RichToken = {
  readonly raw: string; // The raw JWT value, unchanged
  readonly parsed: MinimalTokenPayload; // Rich data on the JWT value
};

/** @internal - For unit tests only */
export type JwtMetadata = Pick<MinimalTokenPayload, "iat" | "exp">;

export function isTokenExpired(token: JwtMetadata): boolean {
  const now = Date.now() / 1000;
  const valid = now <= token.exp - 300 && now >= token.iat - 300;
  return !valid;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((i) => typeof i === "string");
}

function isMinimalTokenPayload(data: Json): data is MinimalTokenPayload {
  //
  // NOTE: This is the hard-coded definition of the following decoder:
  //
  //   object({
  //     iat: number,
  //     exp: number,
  //     appId: string,
  //     roomId: string,
  //     actor: number,
  //     scopes: array(scope),
  //     maxConnectionsPerRoom: optional(number),
  //     id: optional(string),
  //     info: optional(json),
  //   })
  //
  return (
    isPlainObject(data) &&
    typeof data.iat === "number" &&
    typeof data.exp === "number" &&
    typeof data.appId === "string" &&
    typeof data.roomId === "string" &&
    typeof data.actor === "number" &&
    (data.id === undefined || typeof data.id === "string") &&
    isStringList(data.scopes) &&
    (data.maxConnectionsPerRoom === undefined ||
      typeof data.maxConnectionsPerRoom === "number")
    // NOTE: Nothing to validate for `info` field. It's already Json | undefined,
    // because data is a JsonObject
    // info?: Json;
  );
}

/**
 * Parses a raw JWT token string, which allows reading the metadata/payload of
 * the token.
 *
 * NOTE: Doesn't do any validation, so always treat the metadata as other user
 * input: never trust these values for anything important.
 */
export function parseAuthToken(rawTokenString: string): RichToken {
  const tokenParts = rawTokenString.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Authentication error: invalid JWT token");
  }

  const payload = tryParseJson(b64decode(tokenParts[1]));
  if (!(payload && isMinimalTokenPayload(payload))) {
    throw new Error(
      "Authentication error: we expected a room token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
    );
  }

  return {
    raw: rawTokenString,
    parsed: payload,
  };
}
