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
 * Assign this to a room or room pattern if you want to grant the user
 * read-only permissions for this room.
 */
export const READ_ACCESS: readonly Permission[] = Object.freeze([
  "room:read",
  // "room:presence:write",  // XXX Should this be included in the READ_ACCESS set?
  "comments:read",
]);

/**
 * Assign this to a room or room pattern if you want to grant the user all
 * permissions for this room.
 */
export const FULL_ACCESS: readonly Permission[] = Object.freeze([
  "room:write",
  "comments:write",

  // XXX Are these implied automatically if you have the two write permissions above? If so, it would be nice to keep the JWT payload as small as possible.
  // "room:read",
  // "room:presence:write",
  // "comments:read",
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
export class PermissionSet {
  private _sealed = false;
  private readonly _permissions: Map<string, Set<Permission>> = new Map();

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

  public allow(
    roomIdOrPattern: string,
    newPerms: readonly Permission[] = FULL_ACCESS
  ): this {
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

  public isEmpty(): boolean {
    return this._permissions.size === 0;
  }

  public seal(): void {
    if (this._sealed) {
      throw new Error(
        "You cannot reuse Permissions instances. Please create a new instance every time."
      );
    }
    this._sealed = true;
  }

  public toJSON(): Record<string, unknown> {
    return Object.fromEntries(
      Array.from(this._permissions.entries()).map(([key, scopes]) => [
        key,
        Array.from(scopes),
      ])
    );
  }
}
