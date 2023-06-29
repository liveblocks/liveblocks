// As defined in the source of truth in ApiScope in
// https://github.com/liveblocks/liveblocks-cloudflare/blob/main/src/security.ts
export type Permission =
  | "room:write"
  | "room:read"
  | "room:presence:write"
  | "comments:write"
  | "comments:read"
  | "events";

const MAX_PERMS_PER_TOKEN = 10;

// XXX Think about this: should these be exported as _symbols_ instead which
// will be recognized and swapped out with the defaults?
export const READ_ACCESS = Object.freeze([
  "room:read",
  "comments:read",
] as Permission[]);
export const FULL_ACCESS = Object.freeze([
  "room:write",
  "comments:write",
] as Permission[]);

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
    const existingPerms = this.getOrCreate(roomIdOrPattern);
    for (const perm of newPerms) {
      if (existingPerms.size > MAX_PERMS_PER_TOKEN) {
        throw new Error("You cannot grant more than 10 permission per token");
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
