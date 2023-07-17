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
  scopes: string[]; // Think Scope[], but it could also hold scopes from the future, hence string[]
  actor: number;

  // Extra payload as defined by the customer's own authorization
  id?: string;
  info?: Json;

  // IMPORTANT: All other fields on the JWT token are deliberately treated as
  // opaque, and not relied on by the client.
  [other: string]: Json | undefined;
};

// The "rich" token is data we obtain by parsing the JWT token and making all
// metadata on it accessible. It's done right after hitting the backend, but
// before the promise will get returned, so it's an inherent part of the
// authentication step.
export type ParsedAuthToken = {
  readonly raw: string; // The raw JWT value, unchanged
  readonly parsed: MinimalTokenPayload; // Rich data on the JWT value
};

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((i) => typeof i === "string");
}

function isMinimalTokenPayload(data: Json): data is MinimalTokenPayload {
  //
  // NOTE: This is the hard-coded definition of the following decoder:
  //
  //   inexact({
  //     actor: number,
  //     scopes: array(scope),
  //     id: optional(string),
  //     info: optional(json),
  //   })
  //
  return (
    isPlainObject(data) &&
    typeof data.actor === "number" &&
    (data.id === undefined || typeof data.id === "string") &&
    isStringList(data.scopes)
    // && data.info will already be `Json | undefined`, given the nature of the data here
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
