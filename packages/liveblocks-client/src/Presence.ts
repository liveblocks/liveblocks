import type { BaseUserMeta, JsonObject, Others, User } from "./types";
import { compact, compactObject } from "./utils";

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

export function makeOthers<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
>(userMap: {
  [key: number]: User<TPresence, TUserMeta>;
}): Others<TPresence, TUserMeta> {
  const users = Object.values(userMap).map((user) => {
    const { _hasReceivedInitialPresence, ...publicKeys } = user;
    return publicKeys;
  });

  return {
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

  // Derived/cached data. Never set these directly.
  /** @internal */
  _others: Others<TPresence, TUserMeta> | undefined;
  /** @internal */
  _snapshot: { me: TPresence; others: TPresence[] } | undefined;

  constructor(initialPresence: TPresence) {
    // Me
    this._me = compactObject(initialPresence);

    // Others
    this._connections = {};
    this._presences = {};
  }

  clearOthers() {
    this._connections = {};
    this._presences = {};
    this._users = {};
    this._invalidateOthers();
  }

  get me(): TPresence {
    return this._me;
  }

  getUser(connectionId: number): User<TPresence, TUserMeta> | undefined {
    const conn = this._connections[connectionId];
    const presence = this._presences[connectionId];
    if (conn !== undefined && presence !== undefined) {
      const user: User<TPresence, TUserMeta> = { ...conn, presence };
      return user;
    }

    return undefined;
  }

  _getUsers(): User<TPresence, TUserMeta>[] {
    return compact(
      Object.keys(this._presences).map((connectionId) =>
        this.getUser(Number(connectionId))
      )
    );
  }

  get others(): Others<TPresence, TUserMeta> {
    return this._others ?? (this._others = makeOthers(this._getUsers()));
  }

  /** @internal */
  _invalidateOthers(): void {
    this._others = undefined;
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

  toImmutable(): { me: TPresence; others: TPresence[] } {
    return (
      this._snapshot ??
      (this._snapshot = {
        me: this.me,
        others: compact(this.others.map((other) => other.presence)),
      })
    );
  }

  /**
   * Patches the current "me" instance.
   */
  patchMe(patch: Partial<TPresence>): void {
    const oldMe = this.me;
    const newMe = merge(oldMe, patch);
    if (oldMe !== newMe) {
      this._me = newMe;
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
    this._connections[connectionId] = {
      connectionId,
      id: metaUserId,
      info: metaUserInfo,
    };
    if (this._presences[connectionId] !== undefined) {
      this._invalidateOthers();
    }
  }

  /**
   * Removes a known connectionId. Removes both the connection's metadata and
   * the presence information.
   */
  removeConnection(connectionId: number): void {
    delete this._connections[connectionId];
    delete this._presences[connectionId];
    this._invalidateOthers();
  }

  /**
   * Stores a new user from a full presence update. If the user already exists,
   * its known presence data is overwritten.
   */
  setOther(connectionId: number, presence: TPresence): void {
    this._presences[connectionId] = compactObject(presence);
    if (this._connections[connectionId] !== undefined) {
      this._invalidateOthers();
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
      this._presences[connectionId] = newPresence;
      this._invalidateOthers();
    }
  }
}
