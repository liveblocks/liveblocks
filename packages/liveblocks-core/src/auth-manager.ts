import { StopRetrying } from "./connection";
import { isPlainObject } from "./lib/guards";
import type { Json } from "./lib/Json";
import type { Relax } from "./lib/Relax";
import { stringifyOrLog as stringify } from "./lib/stringify";
import type {
  PermissionResources,
  RequiredAccessLevel,
  RoomPatternPermissions,
} from "./permissions";
import {
  hasPermissionAccess,
  normalizeRoomPermissions,
  resolveRoomPermissionMatrix,
} from "./permissions";
import type {
  Authentication,
  CustomAuthenticationResult,
} from "./protocol/Authentication";
import type { AuthToken, ParsedAuthToken } from "./protocol/AuthToken";
import { parseAuthToken, TokenKind } from "./protocol/AuthToken";
import type { Polyfills } from "./room";

export type AuthValue =
  | { type: "secret"; token: ParsedAuthToken }
  | { type: "public"; publicApiKey: string };

type RoomAuthResource = Exclude<PermissionResources, "personal">;

export type AuthRequest = Relax<
  | {
      resource: RoomAuthResource;
      roomId: string;
      access: RequiredAccessLevel;
    }
  | {
      // Not a JWT scope. Used for roomless APIs (inbox, notification settings, etc.)
      resource: "personal";
      access: "write";
    }
>;

export type AuthManager = {
  reset(): void;
  getAuthValue(requestOptions: AuthRequest): Promise<AuthValue>;
};

type AuthEndpoint =
  | string
  | ((room?: string) => Promise<CustomAuthenticationResult>);

export type AuthenticationOptions = {
  polyfills?: Polyfills;
} & Relax<{ publicApiKey: string } | { authEndpoint: AuthEndpoint }>;

const NON_RETRY_STATUS_CODES = [
  400, 401, 403, 404, 405, 410, 412, 414, 422, 431, 451,
];

export function createAuthManager(
  authOptions: AuthenticationOptions,
  onAuthenticate?: (token: AuthToken) => void
): AuthManager {
  const authentication = prepareAuthentication(authOptions);

  const seenTokens: Set<string> = new Set();

  const tokens: CachedToken[] = [];

  const requestPromises = new Map<string, Promise<ParsedAuthToken>>();

  function reset() {
    seenTokens.clear();
    tokens.length = 0;
    requestPromises.clear();
  }

  function getCachedToken(
    requestOptions: AuthRequest
  ): ParsedAuthToken | undefined {
    const now = Math.ceil(Date.now() / 1000);

    for (let i = tokens.length - 1; i >= 0; i--) {
      const cachedToken = tokens[i];

      // If this token is expired, remove it from cache, as if it never existed
      // in the first place
      if (cachedToken.expiresAt <= now) {
        tokens.splice(i, 1);
        continue;
      }

      if (cachedTokenSatisfiesRequest(cachedToken, requestOptions)) {
        return cachedToken.token;
      }
    }

    return undefined;
  }

  async function makeAuthRequest(
    options: AuthRequest
  ): Promise<ParsedAuthToken> {
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
      });
      const parsed = parseAuthToken(response.token);

      if (seenTokens.has(parsed.raw)) {
        const cachedToken = getCachedToken(options);
        if (cachedToken?.raw === parsed.raw) {
          return cachedToken;
        }

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

  async function getAuthValue(requestOptions: AuthRequest): Promise<AuthValue> {
    if (authentication.type === "public") {
      return { type: "public", publicApiKey: authentication.publicApiKey };
    }

    const cachedToken = getCachedToken(requestOptions);
    if (cachedToken !== undefined) {
      return { type: "secret", token: cachedToken };
    }

    let currentPromise;
    const requestKey = getAuthRequestKey(requestOptions);
    if (requestKey !== undefined) {
      currentPromise = requestPromises.get(requestKey);
      if (currentPromise === undefined) {
        currentPromise = makeAuthRequest(requestOptions);
        requestPromises.set(requestKey, currentPromise);
      }
    } else {
      currentPromise = requestPromises.get("liveblocks-user-token");
      if (currentPromise === undefined) {
        currentPromise = makeAuthRequest(requestOptions);
        requestPromises.set("liveblocks-user-token", currentPromise);
      }
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
      const cachedToken = makeCachedToken(token, expiresAt);
      tokens.push(cachedToken);

      return { type: "secret", token };
    } finally {
      if (requestKey !== undefined) {
        requestPromises.delete(requestKey);
      } else {
        requestPromises.delete("liveblocks-user-token");
      }
    }
  }

  return {
    reset,
    getAuthValue,
  };
}

type CachedToken = {
  token: ParsedAuthToken;
  expiresAt: number;
  permissions?: RoomPatternPermissions[];
};

function getAuthRequestKey(request: AuthRequest): string | undefined {
  if (request.roomId === undefined) {
    return undefined;
  }

  return `${request.roomId}:${request.resource}:${request.access}`;
}

function makeCachedToken(
  token: ParsedAuthToken,
  expiresAt: number
): CachedToken {
  if (token.parsed.k === TokenKind.ACCESS_TOKEN) {
    return {
      token,
      expiresAt,
      permissions: Object.entries(token.parsed.perms).map(
        ([pattern, scopes]) => ({
          pattern,
          scopes: normalizeRoomPermissions(scopes),
        })
      ),
    };
  }

  return { token, expiresAt };
}

function cachedTokenSatisfiesRequest(
  cachedToken: CachedToken,
  request: AuthRequest
): boolean {
  if (cachedToken.token.parsed.k === TokenKind.ID_TOKEN) {
    // When ID token method is used, only one token per user should be used and cached at the same time.
    return true;
  }

  if (request.resource === "personal") {
    // Any valid token grants access to the user's personal resources (e.g. inbox notifications, notification settings, etc.)
    return true;
  }

  if (request.roomId === undefined) {
    return false;
  }

  const matrix = resolveRoomPermissionMatrix(
    cachedToken.permissions ?? [],
    request.roomId
  );

  if (matrix === undefined) {
    return false;
  }

  return hasPermissionAccess(matrix, request.resource, request.access);
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
