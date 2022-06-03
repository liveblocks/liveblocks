import type { Json, JsonObject } from "./types";
import { b64decode, isPlainObject, tryParseJson } from "./utils";

export type AppOnlyAuthToken = {
  appId: string;
  roomId?: never; // Discriminating field for AuthToken type
  scopes: string[];
};

export type RoomAuthToken = {
  appId: string;
  roomId: string; // Discriminating field for AuthToken type
  scopes: string[];

  maxConnections: number;
  actor: number;
  id?: string;
  info?: Json;
};

export type AuthToken = AppOnlyAuthToken | RoomAuthToken;

interface JwtMetadata extends JsonObject {
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
  return Date.now() / 1000 > token.exp - 300;
}

export function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((scope) => typeof scope === "string")
  );
}

export function isAppOnlyAuthToken(data: JsonObject): data is AppOnlyAuthToken {
  return (
    typeof data.appId === "string" &&
    data.roomId === undefined &&
    isStringList(data.scopes)
  );
}

export function isRoomAuthToken(data: JsonObject): data is RoomAuthToken {
  return (
    typeof data.appId === "string" &&
    typeof data.roomId === "string" &&
    typeof data.actor === "number" &&
    (data.id === undefined || typeof data.id === "string") &&
    isStringList(data.scopes) &&
    typeof data.maxConnections === "number"
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
    throw new Error(
      "Authentication error. Liveblocks could not parse the response of your authentication endpoint"
    );
  }

  const data = tryParseJson(b64decode(tokenParts[1]));
  if (data && hasJwtMeta(data)) {
    return data;
  } else {
    throw new Error(
      "Authentication error. Liveblocks could not parse the response of your authentication endpoint"
    );
  }
}

export function parseRoomAuthToken(token: string): RoomAuthToken & JwtMetadata {
  const data = parseJwtToken(token);
  if (data && isRoomAuthToken(data)) {
    return data;
  } else {
    throw new Error(
      "Authentication error. Liveblocks could not parse the response of your authentication endpoint"
    );
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
