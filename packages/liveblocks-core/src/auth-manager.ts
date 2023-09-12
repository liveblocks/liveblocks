import { StopRetrying } from "./connection";
import type { Json } from "./lib/Json";
import { isPlainObject } from "./lib/utils";
import type {
  Authentication,
  CustomAuthenticationResult,
} from "./protocol/Authentication";
import type { ParsedAuthToken } from "./protocol/AuthToken";
import { parseAuthToken, Permission, TokenKind } from "./protocol/AuthToken";
import type { Polyfills } from "./room";

export type AuthValue =
  | { type: "secret"; token: ParsedAuthToken }
  | { type: "public"; publicApiKey: string };

export type RequestedScope = "room:read" | "comments:read";

export type AuthManager = {
  getAuthValue(
    requestedScope: RequestedScope,
    roomId: string
  ): Promise<AuthValue>;
};

type AuthEndpoint =
  | string
  | ((room: string) => Promise<CustomAuthenticationResult>);

export type AuthenticationOptions = {
  polyfills?: Polyfills;
} & (
  | { publicApiKey: string; authEndpoint?: never }
  | { publicApiKey?: never; authEndpoint: AuthEndpoint }
);

export function createAuthManager(
  authOptions: AuthenticationOptions
): AuthManager {
  const authentication = prepareAuthentication(authOptions);

  const seenTokens: Set<string> = new Set();

  const tokens: ParsedAuthToken[] = [];
  const expiryTimes: number[] = []; // Supposed to always contain the same number of elements as `tokens`

  const requestPromises = new Map<string, Promise<ParsedAuthToken>>();

  function hasCorrespondingScopes(
    requestedScope: RequestedScope,
    scopes: Permission[]
  ) {
    if (requestedScope === "comments:read") {
      return (
        scopes.includes(Permission.CommentsRead) ||
        scopes.includes(Permission.CommentsWrite) ||
        scopes.includes(Permission.Read) ||
        scopes.includes(Permission.Write)
      );
    } else if (requestedScope === "room:read") {
      return (
        scopes.includes(Permission.Read) || scopes.includes(Permission.Write)
      );
    }

    return false;
  }

  function getCachedToken(
    requestedScope: RequestedScope,
    roomId: string
  ): ParsedAuthToken | undefined {
    const now = Math.ceil(Date.now() / 1000);

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      const expiresAt = expiryTimes[i];

      // If this token is expired, remove it from cache, as if it never existed
      // in the first place
      if (expiresAt <= now) {
        tokens.splice(i, 1);
        expiryTimes.splice(i, 1);
        continue;
      }

      if (token.parsed.k === TokenKind.ID_TOKEN) {
        // When ID token method is used, only one token per user should be used and cached at the same time.
        return token;
      } else if (token.parsed.k === TokenKind.ACCESS_TOKEN) {
        for (const [resource, scopes] of Object.entries(token.parsed.perms)) {
          if (
            (resource.includes("*") &&
              roomId.startsWith(resource.replace("*", ""))) ||
            (roomId === resource &&
              hasCorrespondingScopes(requestedScope, scopes))
          ) {
            return token;
          }
        }
      }
    }
    return undefined;
  }

  async function makeAuthRequest(roomId: string): Promise<ParsedAuthToken> {
    const fetcher =
      authOptions.polyfills?.fetch ??
      (typeof window === "undefined" ? undefined : window.fetch);

    if (authentication.type === "private") {
      if (fetcher === undefined) {
        throw new StopRetrying(
          "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
        );
      }

      const response = await fetchAuthEndpoint(fetcher, authentication.url, {
        room: roomId,
      });
      const parsed = parseAuthToken(response.token);

      if (seenTokens.has(parsed.raw)) {
        throw new Error(
          "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
        );
      }

      return parsed;
    }

    if (authentication.type === "custom") {
      const response = await authentication.callback(roomId);
      if (response && typeof response === "object") {
        if (typeof response.token === "string") {
          return parseAuthToken(response.token);
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

  async function getAuthValue(
    requestedScope: RequestedScope,
    roomId: string
  ): Promise<AuthValue> {
    if (authentication.type === "public") {
      return { type: "public", publicApiKey: authentication.publicApiKey };
    }

    const cachedToken = getCachedToken(requestedScope, roomId);
    if (cachedToken !== undefined) {
      return { type: "secret", token: cachedToken };
    }

    let currentPromise = requestPromises.get(roomId);
    if (currentPromise === undefined) {
      currentPromise = makeAuthRequest(roomId);
      requestPromises.set(roomId, currentPromise);
    }
    try {
      const token = await currentPromise;
      // Translate "server timestamps" to "local timestamps" in case clocks aren't in sync
      const BUFFER = 30; // Expire tokens 30 seconds sooner than they have to
      const expiresAt =
        Math.floor(Date.now() / 1000) +
        (token.parsed.exp - token.parsed.iat) -
        BUFFER;

      // Legacy tokens should not get cached
      if (token.parsed.k !== TokenKind.SECRET_LEGACY) {
        seenTokens.add(token.raw);
        tokens.push(token);
        expiryTimes.push(expiresAt);
      }

      return { type: "secret", token };
    } finally {
      requestPromises.delete(roomId);
    }
  }

  return {
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
  }
): Promise<{ token: string }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const reason = `${
      (await res.text()).trim() || "reason not provided in auth response"
    } (${res.status} returned by POST ${endpoint})`;

    if (res.status === 401 || res.status === 403) {
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
      `Expected a JSON response of the form \`{ token: "..." }\` when doing a POST request on "${endpoint}", but got ${JSON.stringify(
        data
      )}`
    );
  }
  const { token } = data;
  return { token };
}
