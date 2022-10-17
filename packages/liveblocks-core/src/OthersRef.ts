import { ImmutableRef, merge } from "./ImmutableRef";
import { asArrayWithLegacyMethods } from "./LegacyArray";
import { freeze } from "./lib/freeze";
import { compact, compactObject } from "./lib/utils";
import type { JsonObject, Others, User } from "./types";
import type { BaseUserMeta } from "./types/BaseUserMeta";

type Connection<TUserMeta extends BaseUserMeta> = {
  readonly connectionId: number;
  readonly id: TUserMeta["id"];
  readonly info: TUserMeta["info"];
  readonly isReadOnly: boolean;
};

function makeUser<TPresence extends JsonObject, TUserMeta extends BaseUserMeta>(
  conn: Connection<TUserMeta>,
  presence: TPresence
): User<TPresence, TUserMeta> {
  return freeze(compactObject({ ...conn, presence }));
}

export class OthersRef<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> extends ImmutableRef<Others<TPresence, TUserMeta>> {
  // To track "others"
  /** @internal */
  _connections: { [connectionId: number]: Connection<TUserMeta> };
  /** @internal */
  _presences: { [connectionId: number]: TPresence };

  //
  // --------------------------------------------------------------
  //
  // CACHES
  // All of these are derived/cached data. Never set these directly.
  //
  // TODO Refactor this internal cache away using the ImmutableRef
  // abstraction/helper. Manually maintaining these caches should no longer be
  // necessary.
  //
  /** @internal */
  _users: { [connectionId: number]: User<TPresence, TUserMeta> };
  //
  // --------------------------------------------------------------
  //

  constructor() {
    super();

    // Others
    this._connections = {};
    this._presences = {};
    this._users = {};
  }

  /** @internal */
  _toImmutable(): Readonly<Others<TPresence, TUserMeta>> {
    const users = compact(
      Object.keys(this._presences).map((connectionId) =>
        this.getUser(Number(connectionId))
      )
    );

    return asArrayWithLegacyMethods(users);
  }

  clearOthers(): void {
    this._connections = {};
    this._presences = {};
    this._users = {};
    this.invalidate();
  }

  /** @internal */
  _getUser(connectionId: number): User<TPresence, TUserMeta> | undefined {
    const conn = this._connections[connectionId];
    const presence = this._presences[connectionId];
    if (conn !== undefined && presence !== undefined) {
      return makeUser(conn, presence);
    }

    return undefined;
  }

  getUser(connectionId: number): User<TPresence, TUserMeta> | undefined {
    const cachedUser = this._users[connectionId];
    if (cachedUser) {
      return cachedUser;
    }

    const computedUser = this._getUser(connectionId);
    if (computedUser) {
      this._users[connectionId] = computedUser;
      return computedUser;
    }

    return undefined;
  }

  /** @internal */
  _invalidateUser(connectionId: number): void {
    if (this._users[connectionId] !== undefined) {
      delete this._users[connectionId];
    }
    this.invalidate();
  }

  /**
   * Records a known connection. This records the connection ID and the
   * associated metadata.
   */
  setConnection(
    connectionId: number,
    metaUserId: TUserMeta["id"],
    metaUserInfo: TUserMeta["info"],
    metaIsReadonly: boolean
  ): void {
    this._connections[connectionId] = freeze({
      connectionId,
      id: metaUserId,
      info: metaUserInfo,
      isReadOnly: metaIsReadonly,
    });
    if (this._presences[connectionId] !== undefined) {
      this._invalidateUser(connectionId);
    }
  }

  /**
   * Removes a known connectionId. Removes both the connection's metadata and
   * the presence information.
   */
  removeConnection(connectionId: number): void {
    delete this._connections[connectionId];
    delete this._presences[connectionId];
    this._invalidateUser(connectionId);
  }

  /**
   * Stores a new user from a full presence update. If the user already exists,
   * its known presence data is overwritten.
   */
  setOther(connectionId: number, presence: TPresence): void {
    this._presences[connectionId] = freeze(compactObject(presence));
    if (this._connections[connectionId] !== undefined) {
      this._invalidateUser(connectionId);
    }
  }

  /**
   * Patches the presence data for an existing "other". If we don't know the
   * initial presence data for this user yet, discard this patch and await the
   * full .setOther() call first.
   */
  patchOther(connectionId: number, patch: Partial<TPresence>): void {
    const oldPresence = this._presences[connectionId];
    if (oldPresence === undefined) {
      return;
    }

    const newPresence = merge(oldPresence, patch);
    if (oldPresence !== newPresence) {
      this._presences[connectionId] = freeze(newPresence);
      this._invalidateUser(connectionId);
    }
  }
}
