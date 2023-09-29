import type { AuthResponse } from "./client";
import { assertNonEmpty, normalizeStatusCode } from "./utils";

// As defined in the source of truth in ApiScope in
// https://github.com/liveblocks/liveblocks-cloudflare/blob/main/src/security.ts
const ALL_PERMISSIONS = Object.freeze([
  "room:write",
  "room:read",
  "room:presence:write",
  "comments:write",
  "comments:read",
] as const);

export type Permission = (typeof ALL_PERMISSIONS)[number];

function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly unknown[]).includes(value);
}

const MAX_PERMS_PER_SET = 10;

/**
 * Assign this to a room (or wildcard pattern) if you want to grant the user
 * read permissions to the storage and comments data for this room. (Note that
 * the user will still have permissions to update their own presence.)
 */
const READ_ACCESS = Object.freeze([
  "room:read",
  "room:presence:write",
  "comments:read",
] as const);

/**
 * Assign this to a room (or wildcard pattern) if you want to grant the user
 * permissions to read and write to the room's storage and comments.
 */
const FULL_ACCESS = Object.freeze(["room:write", "comments:write"] as const);

const roomPatternRegex = /^[^*]{1,128}[*]?$/;

type PostFn = (
  path: `/${string}`,
  json: Record<string, unknown>
) => Promise<Response>;

/**
 * Class to help you construct the exact permission set to grant a user, used
 * when making `.authorizeUser()` calls.
 *
 * Usage:
 *
 *    const session = liveblocks.prepareSession();
 *    session.allow(roomId, permissions)  // or...
 *
 * For the `permissions` argument, you can pass a list of specific permissions,
 * or use one of our presets:
 *
 *    session.allow('my-room', session.FULL_ACCESS)  // Read + write access to room storage and comments
 *    session.allow('my-room', session.READ_ACCESS)  // Read-only access to room storage and comments
 *
 * Rooms can be specified with a prefix match, if the name ends in an asterisk.
 * In that case, access is granted to *all* rooms that start with that prefix:
 *
 *    // Read + write access to *all* rooms that start with "abc:"
 *    session.allow('abc:*', session.FULL_ACCESS)
 *
 * You can define at most 10 room IDs (or patterns) in a single token,
 * otherwise the token would become too large and unwieldy.
 *
 * All permissions granted are additive. You cannot "remove" permissions once
 * you grant them. For example:
 *
 *    session
 *      .allow('abc:*',   session.FULL_ACCESS)
 *      .allow('abc:123', session.READ_ACCESS)
 *
 * Here, room `abc:123` would have full access. The second .allow() call only
 * _adds_ read permissions, but that has no effect since full access
 * permissions were already added to the set.
 */
export class Session {
  public readonly FULL_ACCESS = FULL_ACCESS;
  public readonly READ_ACCESS = READ_ACCESS;

  /** @internal */
  private _postFn: PostFn;
  /** @internal */
  private _userId: string;
  /** @internal */
  private _userInfo?: unknown;
  /** @internal */
  private _sealed = false;
  /** @internal */
  private readonly _permissions: Map<string, Set<Permission>> = new Map();

  /** @internal */
  constructor(postFn: PostFn, userId: string, userInfo?: unknown) {
    assertNonEmpty(userId, "userId"); // TODO: Check if this is a legal userId value too

    this._postFn = postFn;
    this._userId = userId;
    this._userInfo = userInfo;
  }

  /** @internal */
  private getOrCreate(roomId: string): Set<Permission> {
    if (this._sealed) {
      throw new Error("You can no longer change these permissions.");
    }

    let perms = this._permissions.get(roomId);
    if (perms) {
      return perms;
    } else {
      if (this._permissions.size >= MAX_PERMS_PER_SET) {
        throw new Error(
          "You cannot add permissions for more than 10 rooms in a single token"
        );
      }

      perms = new Set<Permission>();
      this._permissions.set(roomId, perms);
      return perms;
    }
  }

  public allow(roomIdOrPattern: string, newPerms: readonly Permission[]): this {
    if (!roomPatternRegex.test(roomIdOrPattern)) {
      throw new Error("Invalid room name or pattern");
    }

    if (newPerms.length === 0) {
      throw new Error("Permission list cannot be empty");
    }

    const existingPerms = this.getOrCreate(roomIdOrPattern);
    for (const perm of newPerms) {
      if (!isPermission(perm as string)) {
        throw new Error(`Not a valid permission: ${perm}`);
      }
      existingPerms.add(perm);
    }
    return this; // To allow chaining multiple allow calls
  }

  /** @internal - For unit tests only */
  public hasPermissions(): boolean {
    return this._permissions.size > 0;
  }

  /** @internal - For unit tests only */
  public seal(): void {
    if (this._sealed) {
      throw new Error(
        "You cannot reuse Session instances. Please create a new session every time."
      );
    }
    this._sealed = true;
  }

  /** @internal - For unit tests only */
  public serializePermissions(): Record<string, unknown> {
    return Object.fromEntries(
      Array.from(this._permissions.entries()).map(([pat, perms]) => [
        pat,
        Array.from(perms),
      ])
    );
  }

  /**
   * Call this to authorize the session to access Liveblocks. Note that this
   * will return a Liveblocks "access token". Anyone that obtains such access
   * token will have access to the allowed resources.
   */
  public async authorize(): Promise<AuthResponse> {
    this.seal();
    if (!this.hasPermissions()) {
      return {
        status: 403,
        body: "Forbidden",
      };
    }

    try {
      const resp = await this._postFn("/v2/authorize-user", {
        // Required
        userId: this._userId,
        permissions: this.serializePermissions(),

        // Optional metadata
        userInfo: this._userInfo,
      });

      return {
        status: normalizeStatusCode(resp.status),
        body: await resp.text(),
      };
    } catch (er) {
      return {
        status: 503 /* Service Unavailable */,
        body: 'Call to /v2/authorize-user failed. See "error" for more information.',
        error: er as Error | undefined,
      };
    }
  }
}
