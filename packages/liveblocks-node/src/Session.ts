import type { AuthResponse, Liveblocks } from "./new-auth";
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
const READ_ACCESS: readonly Permission[] = Object.freeze([
  "room:read",
  "room:presence:write",
  "comments:read",
]);

/**
 * Assign this to a room (or wildcard pattern) if you want to grant the user
 * permissions to read and write to the room's storage and comments.
 */
const FULL_ACCESS: readonly Permission[] = Object.freeze([
  "room:write",
  "comments:write",
]);

const roomPatternRegex = /^[^*]{1,50}[*]?$/;

/**
 * Class to help you construct the exact permission set to grant a user, used
 * when making `.authorizeUser()` calls.
 *
 * Usage:
 *
 *    const p = new Permissions();
 *    p.allow(roomId, scopes)  // or...
 *
 * Example:
 *
 *    p.allow('my-room', FULL_ACCESS)  // Grant read + write access to 'my-room'
 *    p.allow('my-room', READ_ACCESS)  // Grant read-only access to 'my-room'
 *
 * Rooms can be specified with a prefix match, if the name ends in an asterisk.
 * In that case, access is granted to all rooms that start with that pattern:
 *
 *    p.allow('abc:*', FULL_ACCESS)    // Grant read + write access to all rooms that start with "abc:"
 *
 * You can define at most 10 room IDs or patterns in a single token, otherwise
 * the token would become too large and unwieldy.
 *
 * All permissions granted are additive. You cannot "remove" permissions once
 * you grant them. For example:
 *
 *    p
 *      .allow('abc:*',   FULL_ACCESS)
 *      .allow('abc:123', READ_ACCESS)
 *
 * Here, room `abc:123` would have full access. The second .allow() call only
 * _adds_ read permissions, but that has no effect since full access
 * permissions were already added to the set.
 */
export class Session {
  public readonly FULL_ACCESS = FULL_ACCESS;
  public readonly READ_ACCESS = READ_ACCESS;

  private _client: Liveblocks;
  private _userId: string;
  private _userInfo?: unknown;
  private _sealed = false;
  private readonly _permissions: Map<string, Set<Permission>> = new Map();

  constructor(client: Liveblocks, userId: string, userInfo?: unknown) {
    assertNonEmpty(userId, "userId"); // TODO: Check if this is a legal userId value too

    this._client = client;
    this._userId = userId;
    this._userInfo = userInfo;
  }

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

  public hasPermissions(): boolean {
    return this._permissions.size > 0;
  }

  public seal(): void {
    if (this._sealed) {
      throw new Error(
        "You cannot reuse Session instances. Please create a new session every time."
      );
    }
    this._sealed = true;
  }

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
      const resp = await this._client.post("/v2/authorize-user", {
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
