import {
  type AuthCredential,
  type AuthRequest,
  type AuthStrategy,
  type CachedCredential,
  defaultSatisfies,
  getAuthRequestKey,
} from "./auth-strategy";
import { liveblocksJwtStrategy } from "./auth-strategy-jwt";
import { StopRetrying } from "./connection";
import type { Relax } from "./lib/Relax";
import type { CustomAuthenticationResult } from "./protocol/Authentication";
import type { Polyfills } from "./room";

export type {
  AuthCredential,
  AuthRequest,
  AuthResult,
  AuthScope,
  AuthStrategy,
  CachedCredential,
} from "./auth-strategy";

export type AuthValue =
  | { type: "public"; publicApiKey: string }
  | { type: "credential"; credential: AuthCredential };

export type AuthManager = {
  reset(): void;
  getAuthValue(requestOptions: AuthRequest): Promise<AuthValue>;
  /**
   * Drops any cached entry matching the given auth value and forwards to the
   * strategy's `invalidate()` (if any). Used by the 401/403 paths so that the
   * next request re-authenticates instead of reusing a revoked credential.
   */
  invalidate(authValue: AuthValue): void;
};

type AuthEndpoint =
  | string
  | ((room?: string) => Promise<CustomAuthenticationResult>);

export type AuthenticationOptions = {
  polyfills?: Polyfills;
} & Relax<
  | { publicApiKey: string }
  | { authEndpoint: AuthEndpoint }
  | { auth: AuthStrategy }
>;

type AuthMode =
  | { type: "public"; publicApiKey: string }
  | { type: "strategy"; strategy: AuthStrategy };

function resolveAuthMode(authOptions: AuthenticationOptions): AuthMode {
  const { publicApiKey, authEndpoint, auth } = authOptions;

  if (auth !== undefined) {
    if (publicApiKey !== undefined || authEndpoint !== undefined) {
      throw new Error(
        "You cannot simultaneously use `auth` and `publicApiKey`/`authEndpoint` options. Please pick one and leave the others unspecified. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
      );
    }
    return { type: "strategy", strategy: auth };
  }

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
    return { type: "public", publicApiKey };
  }

  if (typeof authEndpoint === "string") {
    return {
      type: "strategy",
      strategy: liveblocksJwtStrategy({
        authEndpoint,
        polyfills: authOptions.polyfills,
      }),
    };
  } else if (typeof authEndpoint === "function") {
    return {
      type: "strategy",
      strategy: liveblocksJwtStrategy({
        authEndpoint,
        polyfills: authOptions.polyfills,
      }),
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

export function createAuthManager(
  authOptions: AuthenticationOptions
): AuthManager {
  const mode = resolveAuthMode(authOptions);

  const cache: CachedCredential[] = [];
  const requestPromises = new Map<string, Promise<AuthCredential>>();

  function reset() {
    cache.length = 0;
    requestPromises.clear();
    if (mode.type === "strategy") {
      mode.strategy.reset?.();
    }
  }

  function invalidate(authValue: AuthValue) {
    if (authValue.type !== "credential") {
      return;
    }
    const token = authValue.credential.token;
    for (let i = cache.length - 1; i >= 0; i--) {
      if (cache[i].credential.token === token) {
        cache.splice(i, 1);
      }
    }
    if (mode.type === "strategy") {
      mode.strategy.invalidate?.(authValue.credential);
    }
  }

  function getCachedCredential(
    requestOptions: AuthRequest
  ): AuthCredential | undefined {
    const now = Math.ceil(Date.now() / 1000);
    const strategySatisfies =
      mode.type === "strategy" ? mode.strategy.satisfies : undefined;

    for (let i = cache.length - 1; i >= 0; i--) {
      const cached = cache[i];
      const expiresAt = cached.credential.expiresAt;

      // If this credential is expired, remove it from cache, as if it never
      // existed in the first place.
      if (expiresAt !== undefined && expiresAt <= now) {
        cache.splice(i, 1);
        continue;
      }

      const satisfies =
        strategySatisfies !== undefined
          ? strategySatisfies(cached.credential, requestOptions)
          : defaultSatisfies(cached, requestOptions);

      if (satisfies) {
        return cached.credential;
      }
    }

    return undefined;
  }

  async function getAuthValue(requestOptions: AuthRequest): Promise<AuthValue> {
    if (mode.type === "public") {
      return { type: "public", publicApiKey: mode.publicApiKey };
    }

    const strategy = mode.strategy;

    const cachedCredential = getCachedCredential(requestOptions);
    if (cachedCredential !== undefined) {
      return { type: "credential", credential: cachedCredential };
    }

    const key = getAuthRequestKey(requestOptions);
    let currentPromise = requestPromises.get(key);
    if (currentPromise === undefined) {
      currentPromise = (async () => {
        const result = await strategy.authenticate(requestOptions);
        if (!result.ok) {
          if (result.fatal) {
            throw new StopRetrying(result.reason);
          }
          throw new Error(result.reason);
        }
        return result.credential;
      })();
      requestPromises.set(key, currentPromise);
    }

    try {
      const credential = await currentPromise;
      // Only cache credentials with a known expiry. Credentials without an
      // expiry are never cached and re-fetched on every call.
      if (credential.expiresAt !== undefined) {
        cache.push({ credential, key });
      }
      return { type: "credential", credential };
    } finally {
      requestPromises.delete(key);
    }
  }

  return {
    reset,
    getAuthValue,
    invalidate,
  };
}
