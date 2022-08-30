import type {
  // Actor,
  BaseUserMeta,
  JsonObject,
  Others,
  User,
} from "./types";
import { compact, compactObject, freeze } from "./utils";

export type PresenceSnapshot<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = {
  readonly me: TPresence;
  readonly others: readonly User<TPresence, TUserMeta>[];
  // readonly me: Actor<TPresence, TUserMeta>;
  // readonly others: readonly Actor<TPresence, TUserMeta>[];
};

type Connection<TUserMeta extends BaseUserMeta> = {
  readonly connectionId: number;
  readonly id: TUserMeta["id"];
  readonly info: TUserMeta["info"];
};

/**
 * Patches a target object by "merging in" the provided fields. Patch
 * fields that are explicitly-undefined will delete keys from the target
 * object. Will return a new object.
 *
 * Important guarantee:
 * If the patch effectively did not mutate the target object because the
 * patch fields have the same value as the original, then the original
 * object reference will be returned.
 */
function merge<T>(target: T, patch: Partial<T>): T {
  let updated = false;
  const newValue = { ...target };

  Object.keys(patch).forEach((k) => {
    const key = k as keyof T;
    const val = patch[key];
    if (newValue[key] !== val) {
      if (val === undefined) {
        delete newValue[key];
      } else {
        newValue[key] = val as T[keyof T];
      }
      updated = true;
    }
  });

  return updated ? newValue : target;
}

function makeUser<TPresence extends JsonObject, TUserMeta extends BaseUserMeta>(
  conn: Connection<TUserMeta>,
  presence: TPresence
): User<TPresence, TUserMeta> {
  return freeze(compactObject({ ...conn, presence }));
}

export class Presence<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> {
  // To track "me"
  /** @internal */
  _me: TPresence;

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
  /** @internal */
  _users: { [connectionId: number]: User<TPresence, TUserMeta> };
  /** @internal */
  _others: readonly User<TPresence, TUserMeta>[] | undefined;
  /** @internal */
  _othersProxy: Others<TPresence, TUserMeta> | undefined;
  /** @internal */
  _snapshot: PresenceSnapshot<TPresence, TUserMeta> | undefined;
  //
  // --------------------------------------------------------------
  //

  constructor(initialPresence: TPresence) {
    // Me
    this._me = compactObject(initialPresence);

    // Others
    this._connections = {};
    this._presences = {};
    this._users = {};
  }

  clearOthers(): void {
    this._connections = {};
    this._presences = {};
    this._users = {};
    this._invalidateOthers();
  }

  get me(): TPresence {
    return this._me;
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

  get others(): readonly User<TPresence, TUserMeta>[] {
    return (
      this._others ??
      (this._others = freeze(
        compact(
          Object.keys(this._presences).map((connectionId) =>
            this.getUser(Number(connectionId))
          )
        )
      ))
    );
  }

  // TODO: Deprecate this others proxy! It shouldn't be necessary anymore now
  // that the others property is stable/immutable.
  getOthersProxy(): Others<TPresence, TUserMeta> {
    if (this._othersProxy !== undefined) {
      return this._othersProxy;
    }

    const users = this.others;
    const proxy: Others<TPresence, TUserMeta> = {
      get count() {
        return users.length;
      },
      [Symbol.iterator]() {
        return users[Symbol.iterator]();
      },
      map(callback) {
        return users.map(callback);
      },
      toArray() {
        return users;
      },
    };

    this._othersProxy = proxy;
    return proxy;
  }

  /** @internal */
  _invalidateUser(connectionId: number): void {
    if (this._users[connectionId] !== undefined) {
      delete this._users[connectionId];
    }
    this._invalidateOthers();
  }

  /** @internal */
  _invalidateOthers(): void {
    this._others = undefined;
    this._othersProxy = undefined;
    this._invalidateSnapshot();
  }

  /** @internal */
  _invalidateMe(): void {
    this._invalidateSnapshot();
  }

  /** @internal */
  _invalidateSnapshot(): void {
    this._snapshot = undefined;
  }

  toImmutable(): PresenceSnapshot<TPresence, TUserMeta> {
    return (
      this._snapshot ??
      (this._snapshot = freeze({
        me: this.me,
        others: this.others,
      }))
    );
  }

  /**
   * Patches the current "me" instance.
   */
  patchMe(patch: Partial<TPresence>): void {
    const oldMe = this.me;
    const newMe = merge(oldMe, patch);
    if (oldMe !== newMe) {
      this._me = freeze(newMe);
      this._invalidateMe();
    }
  }

  /**
   * Records a known connection. This records the connection ID and the
   * associated metadata.
   */
  setConnection(
    connectionId: number,
    metaUserId: TUserMeta["id"],
    metaUserInfo: TUserMeta["info"]
  ): void {
    this._connections[connectionId] = freeze({
      connectionId,
      id: metaUserId,
      info: metaUserInfo,
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
