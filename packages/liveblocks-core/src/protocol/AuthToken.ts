import type { Json, JsonObject } from "../lib/Json";
import { b64decode, isPlainObject, tryParseJson } from "../lib/utils";

export type AppOnlyAuthToken = {
  appId: string;
  roomId?: never; // Discriminating field for AuthToken type
  scopes: string[]; // Think Scope[], but it could also hold scopes from the future, hence string[]
};

export enum RoomScope {
  Read = "room:read",
  Write = "room:write",
  PresenceWrite = "room:presence:write",
}

export type RoomAuthToken = {
  appId: string;
  roomId: string; // Discriminating field for AuthToken type
  scopes: string[]; // Think Scope[], but it could also hold scopes from the future, hence string[]
  actor: number;
  maxConnectionsPerRoom?: number;

  // Extra payload as defined by the customer's own authorization
  info?: Json;
  groupIds?: string[];
} & ({ id: string; anonymousId?: never } | { id?: never; anonymousId: string });

export type AuthToken = AppOnlyAuthToken | RoomAuthToken;

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
  return now > token.exp - 300 || now < token.iat + 300;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((i) => typeof i === "string");
}

export function isAppOnlyAuthToken(data: JsonObject): data is AppOnlyAuthToken {
  //
  // NOTE: This is the hard-coded definition of the following decoder:
  //
  //   object({
  //     appId: string,
  //     roomId?: never,
  //     scopes: array(scope),
  //   })
  //
  return (
    typeof data.appId === "string" &&
    data.roomId === undefined &&
    isStringList(data.scopes)
  );
}

export function isRoomAuthToken(data: JsonObject): data is RoomAuthToken {
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

export function isAuthToken(data: JsonObject): data is AuthToken {
  return isAppOnlyAuthToken(data) || isRoomAuthToken(data);
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

export function parseRoomAuthToken(
  tokenString: string
): RoomAuthToken & JwtMetadata {
  const data = parseJwtToken(tokenString);
  if (data && isRoomAuthToken(data)) {
    const {
      // If this legacy field is found on the token, pretend it wasn't there,
      // to make all internally used token payloads uniform
      maxConnections: _legacyField,
      ...token
    } = data;
    return token;
  } else {
    throw new Error(
      "Authentication error: we expected a room token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
    );
  }
}
