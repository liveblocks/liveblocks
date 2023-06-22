import type { Json, JsonObject } from "../lib/Json";
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
export type RichToken = {
  readonly raw: string; // The raw JWT value, unchanged
  readonly parsed: MinimalTokenPayload & JwtMetadata; // Rich data on the JWT value
};

export interface JwtMetadata extends JsonObject {
  iat: number;
  exp: number;
}

function hasJwtMeta(data: unknown): data is JwtMetadata {
  if (!isPlainObject(data)) {
    return false;
  }

  const { iat, exp } = data;
  return typeof iat === "number" && typeof exp === "number";
}

export function isTokenExpired(token: JwtMetadata): boolean {
  const now = Date.now() / 1000;
  const valid = now <= token.exp - 300 && now >= token.iat - 300;
  return !valid;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((i) => typeof i === "string");
}

function isMinimalTokenPayload(data: JsonObject): data is MinimalTokenPayload {
  //
  // NOTE: This is the hard-coded definition of the following decoder:
  //
  //   object({
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

function parseJwtToken(token: string): JwtMetadata {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Authentication error: invalid JWT token");
  }

  const data = tryParseJson(b64decode(tokenParts[1]));
  if (data && hasJwtMeta(data)) {
    return data;
  } else {
    throw new Error("Authentication error: missing JWT metadata");
  }
}

export function parseAuthToken(tokenString: string): RichToken {
  const data = parseJwtToken(tokenString);
  if (!(data && isMinimalTokenPayload(data))) {
    throw new Error(
      "Authentication error: we expected a room token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
    );
  }

  const {
    // If this legacy field is found on the token, pretend it wasn't there,
    // to make all internally used token payloads uniform
    maxConnections: _legacyField,
    ...parsedToken
  } = data;

  return {
    raw: tokenString,
    parsed: parsedToken,
  };
}
