import type {
  AuthCredential,
  AuthRequest,
  AuthStrategy,
} from "./auth-strategy";
import { roomPatternMatches } from "./permissions";
import type { IUserInfo } from "./protocol/BaseUserMeta";

/**
 * The value returned by a {@link bearerAuthStrategy}'s `getToken` callback.
 */
export type BearerTokenResult = {
  /** The opaque bearer token string. */
  token: string;
  /**
   * Seconds until the token expires. When omitted, the credential is never
   * cached and `getToken` is re-invoked on every request.
   */
  expiresIn?: number;
  /** Optional user id propagated to room/AI session info. */
  userId?: string;
  /** Optional user info propagated to room/AI session info. */
  userInfo?: IUserInfo;
  /**
   * Room patterns covered by the token (e.g. `["org-*"]`). Used by the
   * strategy's `satisfies()` to reuse one credential across matching rooms.
   */
  rooms?: string[];
  /**
   * When `true`, the credential also covers the user's personal resources
   * (inbox, notification settings, ...).
   */
  personal?: boolean;
};

export type BearerAuthStrategyOptions = {
  getToken: (request: AuthRequest) => Promise<BearerTokenResult>;
};

/**
 * Public factory for self-hosted Liveblocks deployments. The caller supplies a
 * `getToken` callback that mints/returns an opaque bearer token (and optional
 * scope/identity metadata); the strategy maps it to an {@link AuthCredential}
 * and provides a `satisfies()` that pattern-matches `rooms` against the
 * requested room id and honors the `personal` flag.
 *
 * @example
 * createClient({
 *   baseUrl: "https://my-liveblocks.example.com",
 *   auth: bearerAuthStrategy({
 *     async getToken(req) {
 *       const r = await fetch("/api/session", {
 *         method: "POST", body: JSON.stringify(req),
 *       });
 *       const { token, expiresIn, userId, userInfo, rooms } = await r.json();
 *       return { token, expiresIn, userId, userInfo, rooms, personal: true };
 *     },
 *   }),
 * });
 */
export function bearerAuthStrategy(
  options: BearerAuthStrategyOptions
): AuthStrategy {
  const { getToken } = options;

  async function authenticate(request: AuthRequest) {
    let result: BearerTokenResult;
    try {
      result = await getToken(request);
    } catch (er) {
      return {
        ok: false,
        fatal: false,
        reason: (er as Error).message,
      } as const;
    }

    if (typeof result.token !== "string") {
      return {
        ok: false,
        fatal: false,
        reason:
          'bearerAuthStrategy: getToken must return a { token: "..." } object.',
      } as const;
    }

    const credential: AuthCredential = {
      token: result.token,
      expiresAt:
        result.expiresIn !== undefined
          ? Math.floor(Date.now() / 1000) + result.expiresIn
          : undefined,
      identity:
        result.userId !== undefined
          ? { userId: result.userId, userInfo: result.userInfo }
          : undefined,
      scope: {
        rooms: result.rooms,
        personal: result.personal,
      },
    };

    return { ok: true, credential } as const;
  }

  function satisfies(
    credential: AuthCredential,
    request: AuthRequest
  ): boolean {
    const scope = credential.scope ?? {};
    if (request.resource === "personal") {
      return scope.personal === true;
    }
    if (request.roomId === undefined) {
      return false;
    }
    const rooms = scope.rooms;
    if (rooms === undefined || rooms.length === 0) {
      return false;
    }
    return rooms.some((p) => roomPatternMatches(p, request.roomId));
  }

  return { authenticate, satisfies };
}
