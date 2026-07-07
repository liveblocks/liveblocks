import type {
  AuthCredential,
  AuthRequest,
  AuthResult,
  AuthStrategy,
} from "./auth-strategy";
import { isPlainObject } from "./lib/guards";
import type { Json } from "./lib/Json";
import { stringifyOrLog as stringify } from "./lib/stringify";
import {
  hasPermissionAccess,
  normalizeRoomPermissions,
  resolveRoomPermissionMatrix,
  type RoomPatternPermissions,
} from "./permissions";
import type { CustomAuthenticationResult } from "./protocol/Authentication";
import {
  parseAuthToken,
  TokenKind,
  type AuthToken,
  type ParsedAuthToken,
} from "./protocol/AuthToken";

const NON_RETRY_STATUS_CODES = [
  400, 401, 403, 404, 405, 410, 412, 414, 422, 431, 451,
];

// Expire tokens 30 seconds sooner than they have to, to guard against clock
// skew between client and server.
const EXPIRY_BUFFER_SECONDS = 30;

type AuthEndpoint =
  | string
  | ((room?: string) => Promise<CustomAuthenticationResult>);

/**
 * The subset of {@link Polyfills} used by the JWT strategy. Declared locally to
 * avoid importing from `room.ts` (which would create a type-only import cycle
 * room -> auth-manager -> auth-strategy-jwt -> room).
 */
type JwtPolyfills = {
  fetch?: typeof fetch;
};

type JwtStrategyOptions = {
  authEndpoint: AuthEndpoint;
  polyfills?: JwtPolyfills;
  /**
   * Called whenever a fresh (non-cached) token is fetched. Preserved for
   * backward compatibility with the legacy `onAuthenticate` callback.
   */
  onAuthenticate?: (token: AuthToken) => void;
};

/**
 * Internal entry on a parsed JWT, kept by the strategy so that `satisfies()`
 * can perform permission-matrix matching without re-parsing the raw token.
 */
type ParsedEntry = {
  parsed: ParsedAuthToken;
  credential: AuthCredential;
  permissions?: RoomPatternPermissions[];
};

/**
 * The default Liveblocks JWT auth strategy. It fetches a JWT from an
 * `authEndpoint` (URL or callback), parses it, deduplicates identical raw
 * tokens, and caches by the existing permission-matrix / ID-token rules.
 *
 * This strategy is internal: cloud users never reference it directly. It is
 * constructed by `createAuthManager` from the legacy `publicApiKey` /
 * `authEndpoint` options.
 */
export function liveblocksJwtStrategy(options: JwtStrategyOptions): AuthStrategy {
  const { authEndpoint, polyfills, onAuthenticate } = options;

  // Raw JWT strings we have already seen and cached. Returning the same raw
  // token twice is treated as a misconfiguration (caching Liveblocks tokens is
  // not supported).
  const seenTokens: Set<string> = new Set();

  // Side map from raw JWT -> parsed entry, used by satisfies().
  const parsedByRaw: Map<string, ParsedEntry> = new Map();

  function reset() {
    seenTokens.clear();
    parsedByRaw.clear();
  }

  function invalidate(credential: AuthCredential) {
    seenTokens.delete(credential.token);
    parsedByRaw.delete(credential.token);
  }

  function makePermissions(parsed: ParsedAuthToken): RoomPatternPermissions[] | undefined {
    if (parsed.parsed.k === TokenKind.ACCESS_TOKEN) {
      return Object.entries(parsed.parsed.perms).map(([pattern, scopes]) => ({
        pattern,
        scopes: normalizeRoomPermissions(scopes),
      }));
    }
    return undefined;
  }

  function makeCredential(parsed: ParsedAuthToken): AuthCredential {
    const BUFFER = EXPIRY_BUFFER_SECONDS;
    const expiresAt =
      Math.floor(Date.now() / 1000) +
      (parsed.parsed.exp - parsed.parsed.iat) -
      BUFFER;

    const scope =
      parsed.parsed.k === TokenKind.ID_TOKEN
        ? { personal: true, rooms: ["*"] }
        : {
            rooms: Object.keys(parsed.parsed.perms),
          };

    return {
      token: parsed.raw,
      expiresAt,
      identity: { userId: parsed.parsed.uid, userInfo: parsed.parsed.ui },
      scope,
    };
  }

  function entrySatisfiesRequest(
    entry: ParsedEntry,
    request: AuthRequest
  ): boolean {
    const { parsed } = entry;
    if (parsed.parsed.k === TokenKind.ID_TOKEN) {
      // When the ID token method is used, only one token per user should be
      // used and cached at the same time.
      return true;
    }

    if (request.resource === "personal") {
      // Any valid token grants access to the user's personal resources (e.g.
      // inbox notifications, notification settings, etc.)
      return true;
    }

    if (request.roomId === undefined) {
      return false;
    }

    const matrix = resolveRoomPermissionMatrix(
      entry.permissions ?? [],
      request.roomId
    );

    if (matrix === undefined) {
      return false;
    }

    return hasPermissionAccess(matrix, request.resource, request.access);
  }

  async function fetchFromUrl(
    fetcher: typeof window.fetch,
    url: string,
    body: { room?: string }
  ): Promise<AuthResult> {
    const res = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: stringify(body),
    });
    if (!res.ok) {
      const reason = `${
        (await res.text()).trim() || "reason not provided in auth response"
      } (${res.status} returned by POST ${url})`;

      if (NON_RETRY_STATUS_CODES.includes(res.status)) {
        // Throw a special error instance, which the connection manager will
        // recognize and understand that retrying will have no effect
        return { ok: false, fatal: true, reason: `Unauthorized: ${reason}` };
      } else {
        return { ok: false, fatal: false, reason: `Failed to authenticate: ${reason}` };
      }
    }

    let data: Json;
    try {
      data = await (res.json() as Promise<Json>);
    } catch (er) {
      return {
        ok: false,
        fatal: false,
        reason: `Expected a JSON response when doing a POST request on "${url}". ${String(
          er
        )}`,
      };
    }

    if (!isPlainObject(data) || typeof data.token !== "string") {
      return {
        ok: false,
        fatal: false,
        reason: `Expected a JSON response of the form \`{ token: "..." }\` when doing a POST request on "${url}", but got ${stringify(
          data
        )}`,
      };
    }
    return { ok: true, credential: { token: data.token } };
  }

  async function fetchFromCallback(
    callback: (room?: string) => Promise<CustomAuthenticationResult>,
    roomId: string | undefined
  ): Promise<AuthResult> {
    let response: CustomAuthenticationResult;
    try {
      response = await callback(roomId);
    } catch (er) {
      // Surface the original error message verbatim (e.g. tests assert "Huh?").
      return { ok: false, fatal: false, reason: (er as Error).message };
    }

    if (response && typeof response === "object") {
      if (typeof response.token === "string") {
        return { ok: true, credential: { token: response.token } };
      } else if (typeof response.error === "string") {
        const reason = `Authentication failed: ${
          "reason" in response && typeof response.reason === "string"
            ? response.reason
            : "Forbidden"
        }`;

        // istanbul ignore else
        if (response.error === "forbidden") {
          return { ok: false, fatal: true, reason };
        } else {
          return { ok: false, fatal: false, reason };
        }
      }
    }

    return {
      ok: false,
      fatal: false,
      reason:
        'Your authentication callback function should return a token, but it did not. Hint: the return value should look like: { token: "..." }',
    };
  }

  async function authenticate(request: AuthRequest): Promise<AuthResult> {
    // Capture the current time synchronously, before any await. This matches
    // the auth manager's cache-eviction tick (which also runs synchronously
    // before the fetch), so the seenTokens "serve from cache" check below uses
    // the same notion of "now" as the manager. Computing `now` after the fetch
    // would diverge under fake timers (e.g. when tests advance the clock and
    // then restore real timers mid-flight).
    const now = Math.ceil(Date.now() / 1000);

    const fetcher =
      polyfills?.fetch ??
      (typeof window === "undefined" ? undefined : window.fetch);

    let rawResult: AuthResult;
    if (typeof authEndpoint === "string") {
      if (fetcher === undefined) {
        return {
          ok: false,
          fatal: true,
          reason:
            "To use Liveblocks client in a non-DOM environment with a url as auth endpoint, you need to provide a fetch polyfill.",
        };
      }
      rawResult = await fetchFromUrl(fetcher, authEndpoint, {
        room: request.roomId,
      });
    } else {
      rawResult = await fetchFromCallback(authEndpoint, request.roomId);
    }

    if (!rawResult.ok) {
      return rawResult;
    }

    const rawToken = rawResult.credential.token;
    let parsed: ParsedAuthToken;
    try {
      parsed = parseAuthToken(rawToken);
    } catch (er) {
      return { ok: false, fatal: false, reason: (er as Error).message };
    }

    // seenTokens dedupe: returning the same raw token twice is a misconfiguration.
    if (seenTokens.has(parsed.raw)) {
      const existing = parsedByRaw.get(parsed.raw);
      if (existing !== undefined) {
        const notExpired =
          existing.credential.expiresAt === undefined ||
          existing.credential.expiresAt > now;
        if (notExpired && entrySatisfiesRequest(existing, request)) {
          // Serve the already-cached credential for this request.
          return { ok: true, credential: existing.credential };
        }
      }
      return {
        ok: false,
        fatal: true,
        reason:
          "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported.",
      };
    }

    const permissions = makePermissions(parsed);
    const credential = makeCredential(parsed);

    seenTokens.add(parsed.raw);
    parsedByRaw.set(parsed.raw, { parsed, credential, permissions });

    onAuthenticate?.(parsed.parsed);
    return { ok: true, credential };
  }

  function satisfies(
    credential: AuthCredential,
    request: AuthRequest
  ): boolean {
    const entry = parsedByRaw.get(credential.token);
    if (entry === undefined) {
      return false;
    }
    return entrySatisfiesRequest(entry, request);
  }

  return { authenticate, satisfies, invalidate, reset };
}
