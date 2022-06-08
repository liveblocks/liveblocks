import type { Json, JsonObject } from "./types";
import { b64decode, isPlainObject, tryParseJson } from "./utils";

export const SCOPES = [
  "websocket:presence",
  "websocket:storage",
  "room:read",
  "room:write",
  "rooms:read",
  "rooms:write",
] as const;

export type Scope = typeof SCOPES[number];

export type AppOnlyAuthToken = {
  appId: string;
  roomId?: never; // Discriminating field for AuthToken type
  scopes: Scope[];
};

export type RoomAuthToken = {
  appId: string;
  roomId: string; // Discriminating field for AuthToken type
  scopes: Scope[];
  actor: number;
  maxConnections: number;
  maxConnectionsPerRoom?: number;

  // Extra payload as defined by the customer's own authorization
  id?: string;
  info?: Json;
};

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

export function isScope(value: unknown): value is Scope {
  return (SCOPES as readonly unknown[]).includes(value);
}

function isScopeList(value: unknown): value is Scope[] {
  return Array.isArray(value) && value.every(isScope);
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
    isScopeList(data.scopes)
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
  //     maxConnections: number,
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
    isScopeList(data.scopes) &&
    typeof data.maxConnections === "number" &&
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

export function parseRoomAuthToken(token: string): RoomAuthToken & JwtMetadata {
  const data = parseJwtToken(token);
  if (data && isRoomAuthToken(data)) {
    return data;
  } else {
    throw new Error("Authentication error: invalid room auth token");
  }
}

export function parseAuthToken(token: string): AuthToken & JwtMetadata {
  const data = parseJwtToken(token);
  if (data && isAuthToken(data)) {
    return data;
  } else {
    throw new Error(
      "Authentication error. Liveblocks could not parse the response of your authentication endpoint"
    );
  }
}
