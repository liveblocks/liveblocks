import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { compact, compactObject } from "../lib/utils";
import { canComment, canWriteStorage } from "../protocol/AuthToken";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { User } from "../types/User";
import { ImmutableRef } from "./ImmutableRef";
import { merge } from "./Signal";

type Connection<U extends BaseUserMeta> = {
  readonly connectionId: number;
  readonly scopes: string[];
  readonly id: U["id"];
  readonly info: U["info"];
};

function makeUser<P extends JsonObject, U extends BaseUserMeta>(
  conn: Connection<U>,
  presence: P
): User<P, U> {
  const { connectionId, id, info } = conn;
  const canWrite = canWriteStorage(conn.scopes);
  return freeze(
    compactObject({
      connectionId,
      id,
      info,
      canWrite,
      canComment: canComment(conn.scopes),
      isReadOnly: !canWrite, // Deprecated, kept for backward-compatibility
      presence,
    })
  );
}

export class OthersRef<
  P extends JsonObject,
  U extends BaseUserMeta,
> extends ImmutableRef<readonly User<P, U>[]> {
  // To track "others"
  private _connections: Map</* connectionId */ number, Connection<U>>;
  private _presences: Map</* connectionId */ number, P>;

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
  private _users: Map</* connectionId */ number, User<P, U>>;
  //
  // --------------------------------------------------------------
  //

  constructor() {
    super();

    // Others
    this._connections = new Map();
    this._presences = new Map();
    this._users = new Map();
  }

  public connectionIds(): IterableIterator<number> {
    return this._connections.keys();
  }

  /** @internal */
  _toImmutable(): readonly User<P, U>[] {
    const users = compact(
      Array.from(this._presences.keys()).map((connectionId) =>
        this.getUser(Number(connectionId))
      )
    );

    return users;
  }

  clearOthers(): void {
    this._connections = new Map();
    this._presences = new Map();
    this._users = new Map();
    this.notify();
  }

  /** @internal */
  _getUser(connectionId: number): User<P, U> | undefined {
    const conn = this._connections.get(connectionId);
    const presence = this._presences.get(connectionId);
    if (conn !== undefined && presence !== undefined) {
      return makeUser(conn, presence);
    }

    return undefined;
  }

  getUser(connectionId: number): User<P, U> | undefined {
    const cachedUser = this._users.get(connectionId);
    if (cachedUser) {
      return cachedUser;
    }

    const computedUser = this._getUser(connectionId);
    if (computedUser) {
      this._users.set(connectionId, computedUser);
      return computedUser;
    }

    return undefined;
  }

  /** @internal */
  _invalidateUser(connectionId: number): void {
    if (this._users.has(connectionId)) {
      this._users.delete(connectionId);
    }
    this.notify();
  }

  /**
   * Records a known connection. This records the connection ID and the
   * associated metadata.
   */
  setConnection(
    connectionId: number,
    metaUserId: U["id"],
    metaUserInfo: U["info"],
    scopes: string[]
  ): void {
    this._connections.set(
      connectionId,
      freeze({
        connectionId,
        id: metaUserId,
        info: metaUserInfo,
        scopes,
      })
    );
    if (this._presences.has(connectionId)) {
      this._invalidateUser(connectionId);
    }
  }

  /**
   * Removes a known connectionId. Removes both the connection's metadata and
   * the presence information.
   */
  removeConnection(connectionId: number): void {
    this._connections.delete(connectionId);
    this._presences.delete(connectionId);
    this._invalidateUser(connectionId);
  }

  /**
   * Stores a new user from a full presence update. If the user already exists,
   * its known presence data is overwritten.
   */
  setOther(connectionId: number, presence: P): void {
    this._presences.set(connectionId, freeze(compactObject(presence)));
    if (this._connections.has(connectionId)) {
      this._invalidateUser(connectionId);
    }
  }

  /**
   * Patches the presence data for an existing "other". If we don't know the
   * initial presence data for this user yet, discard this patch and await the
   * full .setOther() call first.
   */
  patchOther(connectionId: number, patch: Partial<P>): void {
    const oldPresence = this._presences.get(connectionId);
    if (oldPresence === undefined) {
      return;
    }

    const newPresence = merge(oldPresence, patch);
    if (oldPresence !== newPresence) {
      this._presences.set(connectionId, freeze(newPresence));
      this._invalidateUser(connectionId);
    }
  }
}
