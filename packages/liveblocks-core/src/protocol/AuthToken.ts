import { isPlainObject } from "../lib/guards";
import type { Json } from "../lib/Json";
import { b64decode, tryParseJson } from "../lib/utils";
import type { IUserInfo } from "./BaseUserMeta";

export enum Permission {
  Read = "room:read",
  Write = "room:write",
  PresenceWrite = "room:presence:write",
  CommentsWrite = "comments:write",
  CommentsRead = "comments:read",
}

export type LiveblocksPermissions = Record<string, Permission[]>;

export enum TokenKind {
  ACCESS_TOKEN = "acc",
  ID_TOKEN = "id",
}

/**
 * Infers from the given scopes whether the user can write the document (e.g.
 * Storage and/or YDoc).
 */
export function canWriteStorage(scopes: readonly string[]): boolean {
  return scopes.includes(Permission.Write);
}

export function canComment(scopes: readonly string[]): boolean {
  return (
    scopes.includes(Permission.CommentsWrite) ||
    scopes.includes(Permission.Write)
  );
}

type JwtMeta = {
  iat: number;
  exp: number;
};

/**
 * Access Token.
 */
export type AccessToken = {
  k: TokenKind.ACCESS_TOKEN;
  pid: string; // project id
  uid: string; // user id
  perms: LiveblocksPermissions; // permissions
  ui?: IUserInfo; // user info
} & JwtMeta;

/**
 * New authorization ID Token.
 */
export type IDToken = {
  k: TokenKind.ID_TOKEN;
  pid: string; // project id
  uid: string; // user id
  gids?: string[]; // group ids
  ui?: IUserInfo; // user info
} & JwtMeta;

export type AuthToken = AccessToken | IDToken;

// The "rich" token is data we obtain by parsing the JWT token and making all
// metadata on it accessible. It's done right after hitting the backend, but
// before the promise will get returned, so it's an inherent part of the
// authentication step.
export type ParsedAuthToken = {
  readonly raw: string; // The raw JWT value, unchanged
  readonly parsed: AuthToken; // Rich data on the JWT value
};

function isValidAuthTokenPayload(data: Json): data is AccessToken | IDToken {
  return (
    isPlainObject(data) &&
    (data.k === TokenKind.ACCESS_TOKEN || data.k === TokenKind.ID_TOKEN)
  );
}

/**
 * Parses a raw JWT token string, which allows reading the metadata/payload of
 * the token.
 *
 * NOTE: Doesn't do any validation, so always treat the metadata as other user
 * input: never trust these values for anything important.
 */
export function parseAuthToken(rawTokenString: string): ParsedAuthToken {
  const tokenParts = rawTokenString.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Authentication error: invalid JWT token");
  }

  const payload = tryParseJson(b64decode(tokenParts[1]));
  if (!(payload && isValidAuthTokenPayload(payload))) {
    throw new Error(
      "Authentication error: expected a valid token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
    );
  }

  return {
    raw: rawTokenString,
    parsed: payload,
  };
}
