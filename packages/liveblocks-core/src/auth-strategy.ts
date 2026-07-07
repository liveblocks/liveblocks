import type { Relax } from "./lib/Relax";
import type {
  PermissionResources,
  RequiredAccessLevel,
} from "./permissions";
import type { IUserInfo } from "./protocol/BaseUserMeta";

/**
 * The scope of access that an {@link AuthCredential} grants. This metadata is
 * only ever read by an {@link AuthStrategy}'s `satisfies()` implementation (and
 * tests); the Liveblocks client itself never interprets it.
 */
export type AuthScope = {
  /**
   * Room patterns covered by the credential (e.g. `["org-*"]`). Opaque to the
   * client — only the strategy's `satisfies()` reads this.
   */
  rooms?: string[];
  /**
   * When `true`, the credential covers the user's personal resources (inbox
   * notifications, notification settings, etc.) regardless of `rooms`.
   */
  personal?: boolean;
};

/**
 * An opaque credential returned by an {@link AuthStrategy}. The `token` string
 * is sent as the `Bearer` authorization header (or `?tok=` query parameter for
 * the websocket). All other fields are optional metadata used for caching and
 * identity propagation.
 */
export type AuthCredential = {
  /**
   * The opaque token string. Used verbatim as the bearer token.
   */
  token: string;
  /**
   * Epoch seconds at which the credential expires. When absent, the credential
   * is never cached and the strategy is re-invoked on every request.
   */
  expiresAt?: number;
  /**
   * Optional identity carried by the credential. When present, the `userId`
   * is propagated to the room/AI session info. When absent, the session is
   * treated as anonymous (mirrors the `publicApiKey` mode).
   */
  identity?: { userId: string; userInfo?: IUserInfo };
  /**
   * Scope metadata, only read by the strategy's `satisfies()`.
   */
  scope?: AuthScope;
};

/**
 * A request for a credential. The Liveblocks client issues these for room-level
 * resources (realtime/storage/comments/feeds) and for personal resources
 * (inbox, notification settings).
 *
 * NOTE: `resource` is the full {@link PermissionResources} set so that the
 * default JWT strategy can do permission-matrix matching. Self-host strategies
 * that don't care about resource granularity can ignore it.
 */
export type AuthRequest = Relax<
  | {
      resource: Exclude<PermissionResources, "personal">;
      roomId: string;
      access: RequiredAccessLevel;
    }
  | {
      // Not a JWT scope. Used for roomless APIs (inbox, notification settings, etc.)
      resource: "personal";
      access: "write";
    }
>;

/**
 * The outcome of an {@link AuthStrategy.authenticate} call. `fatal` results
 * cause the connection manager to stop retrying (the error is thrown as a
 * `StopRetrying`); non-fatal results keep retrying with backoff.
 */
export type AuthResult =
  | { ok: true; credential: AuthCredential }
  | { ok: false; fatal: boolean; reason: string };

/**
 * A pluggable authentication strategy. Implementations fetch credentials for a
 * given {@link AuthRequest}, optionally declare whether a cached credential
 * satisfies a new request, and react to invalidation.
 *
 * The default {@link createAuthManager} caching behavior is exact-key: a cached
 * credential is reused only for a request with the same `roomId` + `resource` +
 * `access`. Override `satisfies()` to implement pattern-based reuse (see
 * {@link bearerAuthStrategy} and the built-in JWT strategy).
 */
export interface AuthStrategy {
  authenticate(request: AuthRequest): Promise<AuthResult>;
  satisfies?(credential: AuthCredential, request: AuthRequest): boolean;
  invalidate?(credential: AuthCredential): void;
  reset?(): void;
}

/**
 * Internal cache entry stored by the auth manager alongside every cached
 * credential. The `key` is the exact request key used by the default
 * (exact-key) caching when the strategy does not provide a `satisfies()`.
 */
export type CachedCredential = {
  credential: AuthCredential;
  key: string;
};

/**
 * Computes the exact request key used for default caching. Mirrors the legacy
 * dedup key: `${roomId}:${resource}:${access}`, or `"liveblocks-user-token"`
 * for personal (roomless) requests.
 */
export function getAuthRequestKey(request: AuthRequest): string {
  if (request.roomId === undefined) {
    return "liveblocks-user-token";
  }
  return `${request.roomId}:${request.resource}:${request.access}`;
}

/**
 * Default `satisfies()` implementation: a cached credential satisfies a new
 * request only when their exact request keys match. Strategies that wish to
 * reuse a single credential across multiple rooms/resources should override
 * `satisfies()`.
 */
export function defaultSatisfies(
  cached: CachedCredential,
  request: AuthRequest
): boolean {
  return cached.key === getAuthRequestKey(request);
}
