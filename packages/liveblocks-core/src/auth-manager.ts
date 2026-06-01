import { StopRetrying } from "./connection";
import { isPlainObject } from "./lib/guards";
import type { Json } from "./lib/Json";
import type { Relax } from "./lib/Relax";
import { stringifyOrLog as stringify } from "./lib/stringify";
import type {
  Authentication,
  CustomAuthenticationResult,
} from "./protocol/Authentication";
import type { AuthToken, ParsedAuthToken } from "./protocol/AuthToken";
import { parseAuthToken, TokenKind } from "./protocol/AuthToken";
import {
  Permission,
  canUseResolvedRoomPermission,
  resolveRoomPermissions,
  resolveRoomPermissionsWithOverrides,
  type LiveblocksPermission,
  type RoomPermissionLevels,
  type RequestedScope,
} from "./protocol/Permission";
import type { Polyfills } from "./room";

export type { RequestedScope } from "./protocol/Permission";

export type AuthValue =
  | { type: "secret"; token: ParsedAuthToken }
  | { type: "public"; publicApiKey: string };

export type AuthManager = {
  reset(): void;
  getAuthValue(requestOptions: {
    requestedScope: RequestedScope;
    roomId?: string;
  }): Promise<AuthValue>;
};

export type AuthEndpointCallback = (
  room?: string
) => Promise<CustomAuthenticationResult>;

type AuthEndpoint = string | AuthEndpointCallback;

type CachedTokenPermissions = {
  readonly roomPermissionsById: Map<string, RoomPermissionLevels | null>;
  readonly roomlessPermissionsByResource: Map<string, RoomPermissionLevels>;
};

export type AuthenticationOptions = {
  polyfills?: Polyfills;
} & Relax<{ publicApiKey: string } | { authEndpoint: AuthEndpoint }>;

const NON_RETRY_STATUS_CODES = [
  400, 401, 403, 404, 405, 410, 412, 414, 422, 431, 451,
];

function canUseRoomlessTokenWithoutPermissions(requestOptions: {
  requestedScope: RequestedScope;
  roomId?: string;
}): boolean {
  return (
    requestOptions.roomId === undefined &&
    requestOptions.requestedScope === Permission.RoomCommentsRead
  );
}

function getMatchingPermissionScopes(
  permissions: Record<string, LiveblocksPermission[]>,
  roomId: string
): LiveblocksPermission[][] {
  return Object.entries(permissions)
    .map(([resource, scopes]) => {
      if (resource === roomId) {
        return { scopes, specificity: resource.length + 1 };
      }

      if (resource.includes("*")) {
        const prefix = resource.replace("*", "");
        if (roomId.startsWith(prefix)) {
          return { scopes, specificity: prefix.length };
        }
      }

      return undefined;
    })
    .filter(
      (
        entry
      ): entry is { scopes: LiveblocksPermission[]; specificity: number } => {
        return entry !== undefined;
      }
    )
    .sort((left, right) => left.specificity - right.specificity)
    .map((entry) => entry.scopes);
}

export function createAuthManager(
  authOptions: AuthenticationOptions,
  onAuthenticate?: (token: AuthToken) => void
): AuthManager {
  const authentication = prepareAuthentication(authOptions);

  const seenTokens: Set<string> = new Set();

  const tokens: ParsedAuthToken[] = [];
  const expiryTimes: number[] = []; // Supposed to always contain the same number of elements as `tokens`
  const cachedTokenPermissions: CachedTokenPermissions[] = []; // Supposed to always contain the same number of elements as `tokens`

  const requestPromises = new Map<string, Promise<ParsedAuthToken>>();

  function reset() {
    seenTokens.clear();
    tokens.length = 0;
    expiryTimes.length = 0;
    cachedTokenPermissions.length = 0;
    requestPromises.clear();
  }

  function getResolvedRoomPermissions(
    token: ParsedAuthToken,
    permissionsCache: CachedTokenPermissions,
    roomId: string
  ): RoomPermissionLevels | undefined {
    if (permissionsCache.roomPermissionsById.has(roomId)) {
      return permissionsCache.roomPermissionsById.get(roomId) ?? undefined;
    }

    if (token.parsed.k !== TokenKind.ACCESS_TOKEN) {
      permissionsCache.roomPermissionsById.set(roomId, null);
      return undefined;
    }

    const matchingScopes = getMatchingPermissionScopes(
      token.parsed.perms,
      roomId
    );

    if (matchingScopes.length === 0) {
      permissionsCache.roomPermissionsById.set(roomId, null);
      return undefined;
    }

    const permissions = resolveRoomPermissionsWithOverrides(matchingScopes);
    permissionsCache.roomPermissionsById.set(roomId, permissions);
    return permissions;
  }

  function getResolvedRoomlessPermissions(
    permissionsCache: CachedTokenPermissions,
    resource: string,
    scopes: readonly LiveblocksPermission[]
  ): RoomPermissionLevels {
    const cachedPermissions =
      permissionsCache.roomlessPermissionsByResource.get(resource);

    if (cachedPermissions !== undefined) {
      return cachedPermissions;
    }

    const permissions = resolveRoomPermissions(scopes);
    permissionsCache.roomlessPermissionsByResource.set(resource, permissions);
    return permissions;
  }

  function getCachedToken(requestOptions: {
    requestedScope: RequestedScope;
    roomId?: string;
  }): ParsedAuthToken | undefined {
    const now = Math.ceil(Date.now() / 1000);

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      const expiresAt = expiryTimes[i];
      const permissionsCache = cachedTokenPermissions[i];

      // If this token is expired, remove it from cache, as if it never existed
      // in the first place
      if (expiresAt <= now) {
        tokens.splice(i, 1);
        expiryTimes.splice(i, 1);
        cachedTokenPermissions.splice(i, 1);
        continue;
      }

      if (token.parsed.k === TokenKind.ID_TOKEN) {
        // When ID token method is used, only one token per user should be used and cached at the same time.
        return token;
      } else if (token.parsed.k === TokenKind.ACCESS_TOKEN) {
        // In this version, we accept access tokens with zero permission when issuing token for resources outside a room.
        if (
          !requestOptions.roomId &&
          Object.entries(token.parsed.perms).length === 0
        ) {
          if (canUseRoomlessTokenWithoutPermissions(requestOptions)) {
            return token;
          }

          continue;
        }

        if (requestOptions.roomId) {
          const permissions = getResolvedRoomPermissions(
            token,
            permissionsCache,
            requestOptions.roomId
          );

          if (
            permissions !== undefined &&
            canUseResolvedRoomPermission(
              permissions,
              requestOptions.requestedScope
            )
          ) {
            return token;
          }

          continue;
        }

        for (const [resource, scopes] of Object.entries(token.parsed.perms)) {
          // If the requester didn't pass a roomId,
          // it means they need the token to access the user's resources (inbox notifications for example).
          // We return any access token that contains a wildcard for the requested scope.
          if (resource.includes("*")) {
            const permissions = getResolvedRoomlessPermissions(
              permissionsCache,
              resource,
              scopes
            );

            if (
              canUseResolvedRoomPermission(
                permissions,
                requestOptions.requestedScope
              )
            ) {
              return token;
            }
          }
        }
      }
    }

    return undefined;
  }

  function getRequestPromiseKey(requestOptions: {
    requestedScope: RequestedScope;
    roomId?: string;
  }): string {
    return `${requestOptions.roomId ?? "liveblocks-user-token"}:${requestOptions.requestedScope}`;
  }

  async function makeAuthRequest(options: {
    requestedScope: RequestedScope;
    roomId?: string;
  }): Promise<ParsedAuthToken> {
    const fetcher =
      authOptions.polyfills?.fetch ??
      (typeof window === "undefined" ? undefined : window.fetch);

    if (authentication.type === "private") {
      if (fetcher === undefined) {
        throw new StopRetrying(
          "To use Liveblocks client in a non-DOM environment with a url as auth endpoint, you need to provide a fetch polyfill."
        );
      }

      const response = await fetchAuthEndpoint(fetcher, authentication.url, {
        room: options.roomId,
        requestedScope: options.requestedScope,
      });
      const parsed = parseAuthToken(response.token);

      if (seenTokens.has(parsed.raw)) {
        throw new StopRetrying(
          "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
        );
      }

      onAuthenticate?.(parsed.parsed);
      return parsed;
    }

    if (authentication.type === "custom") {
      const response = await authentication.callback(options.roomId);
      if (response && typeof response === "object") {
        if (typeof response.token === "string") {
          const parsed = parseAuthToken(response.token);

          onAuthenticate?.(parsed.parsed);
          return parsed;
        } else if (typeof response.error === "string") {
          const reason = `Authentication failed: ${
            "reason" in response && typeof response.reason === "string"
              ? response.reason
              : "Forbidden"
          }`;

          // istanbul ignore else
          if (response.error === "forbidden") {
            throw new StopRetrying(reason);
          } else {
            throw new Error(reason);
          }
        }
      }

      throw new Error(
        'Your authentication callback function should return a token, but it did not. Hint: the return value should look like: { token: "..." }'
      );
    }

    // istanbul ignore next
    throw new Error(
      "Unexpected authentication type. Must be private or custom."
    );
  }

  async function getAuthValue(requestOptions: {
    requestedScope: RequestedScope;
    roomId?: string;
  }): Promise<AuthValue> {
    if (authentication.type === "public") {
      return { type: "public", publicApiKey: authentication.publicApiKey };
    }

    const cachedToken = getCachedToken(requestOptions);
    if (cachedToken !== undefined) {
      return { type: "secret", token: cachedToken };
    }

    const requestPromiseKey = getRequestPromiseKey(requestOptions);
    let currentPromise = requestPromises.get(requestPromiseKey);
    if (currentPromise === undefined) {
      currentPromise = makeAuthRequest(requestOptions);
      requestPromises.set(requestPromiseKey, currentPromise);
    }

    try {
      const token = await currentPromise;
      // Translate "server timestamps" to "local timestamps" in case clocks aren't in sync
      const BUFFER = 30; // Expire tokens 30 seconds sooner than they have to
      const expiresAt =
        Math.floor(Date.now() / 1000) +
        (token.parsed.exp - token.parsed.iat) -
        BUFFER;

      seenTokens.add(token.raw);
      tokens.push(token);
      expiryTimes.push(expiresAt);
      cachedTokenPermissions.push({
        roomPermissionsById: new Map(),
        roomlessPermissionsByResource: new Map(),
      });

      return { type: "secret", token };
    } finally {
      requestPromises.delete(requestPromiseKey);
    }
  }

  return {
    reset,
    getAuthValue,
  };
}

function prepareAuthentication(
  authOptions: AuthenticationOptions
): Authentication {
  const { publicApiKey, authEndpoint } = authOptions;

  if (authEndpoint !== undefined && publicApiKey !== undefined) {
    throw new Error(
      "You cannot simultaneously use `publicApiKey` and `authEndpoint` options. Please pick one and leave the other option unspecified. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
    );
  }

  if (typeof publicApiKey === "string") {
    if (publicApiKey.startsWith("sk_")) {
      throw new Error(
        "Invalid `publicApiKey` option. The value you passed is a secret key, which should not be used from the client. Please only ever pass a public key here. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientPublicKey"
      );
    } else if (!publicApiKey.startsWith("pk_")) {
      throw new Error(
        "Invalid key. Please use the public key format: pk_<public key>. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientPublicKey"
      );
    }
    return {
      type: "public",
      publicApiKey,
    };
  }

  if (typeof authEndpoint === "string") {
    return {
      type: "private",
      url: authEndpoint,
    };
  } else if (typeof authEndpoint === "function") {
    return {
      type: "custom",
      callback: authEndpoint,
    };
  } else if (authEndpoint !== undefined) {
    throw new Error(
      "The `authEndpoint` option must be a string or a function. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientAuthEndpoint"
    );
  }

  throw new Error(
    "Invalid Liveblocks client options. Please provide either a `publicApiKey` or `authEndpoint` option. They cannot both be empty. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
  );
}

async function fetchAuthEndpoint(
  fetch: typeof window.fetch,
  endpoint: string,
  body: {
    room?: string;
    requestedScope: RequestedScope;
  }
): Promise<{ token: string }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: stringify(body),
  });
  if (!res.ok) {
    const reason = `${
      (await res.text()).trim() || "reason not provided in auth response"
    } (${res.status} returned by POST ${endpoint})`;

    if (NON_RETRY_STATUS_CODES.includes(res.status)) {
      // Throw a special error instance, which the connection manager will
      // recognize and understand that retrying will have no effect
      throw new StopRetrying(`Unauthorized: ${reason}`);
    } else {
      throw new Error(`Failed to authenticate: ${reason}`);
    }
  }

  let data: Json;
  try {
    data = await (res.json() as Promise<Json>);
  } catch (er) {
    throw new Error(
      `Expected a JSON response when doing a POST request on "${endpoint}". ${String(
        er
      )}`
    );
  }

  if (!isPlainObject(data) || typeof data.token !== "string") {
    throw new Error(
      `Expected a JSON response of the form \`{ token: "..." }\` when doing a POST request on "${endpoint}", but got ${stringify(
        data
      )}`
    );
  }
  const { token } = data;
  return { token };
}
