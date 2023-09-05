import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { asArrayWithLegacyMethods } from "../lib/LegacyArray";
import { compact, compactObject } from "../lib/utils";
import { canWriteStorage } from "../protocol/AuthToken";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { Others } from "../types/Others";
import type { User } from "../types/User";
import { ImmutableRef, merge } from "./ImmutableRef";

type Connection<TUserMeta extends BaseUserMeta> = {
  readonly connectionId: number;
  readonly scopes: string[];
  readonly id: TUserMeta["id"];
  readonly info: TUserMeta["info"];
};

function makeUser<TPresence extends JsonObject, TUserMeta extends BaseUserMeta>(
  conn: Connection<TUserMeta>,
  presence: TPresence
): User<TPresence, TUserMeta> {
  const { connectionId, id, info } = conn;
  const canWrite = canWriteStorage(conn.scopes);
  return freeze(
    compactObject({
      connectionId,
      id,
      info,
      canWrite,
      isReadOnly: !canWrite, // Deprecated, kept for backward-compatibility
      presence,
    })
  );
}

export class OthersRef<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> extends ImmutableRef<Others<TPresence, TUserMeta>> {
  // To track "others"
  private _connections: Map</* connectionId */ number, Connection<TUserMeta>>;
  private _presences: Map</* connectionId */ number, TPresence>;

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
  private _users: Map</* connectionId */ number, User<TPresence, TUserMeta>>;
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
  _toImmutable(): Readonly<Others<TPresence, TUserMeta>> {
    const users = compact(
      Array.from(this._presences.keys()).map((connectionId) =>
        this.getUser(Number(connectionId))
      )
    );

    return asArrayWithLegacyMethods(users);
  }

  clearOthers(): void {
    this._connections = new Map();
    this._presences = new Map();
    this._users = new Map();
    this.invalidate();
  }

  /** @internal */
  _getUser(connectionId: number): User<TPresence, TUserMeta> | undefined {
    const conn = this._connections.get(connectionId);
    const presence = this._presences.get(connectionId);
    if (conn !== undefined && presence !== undefined) {
      return makeUser(conn, presence);
    }

    return undefined;
  }

  getUser(connectionId: number): User<TPresence, TUserMeta> | undefined {
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
  setOther(connectionId: number, presence: TPresence): void {
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
  patchOther(connectionId: number, patch: Partial<TPresence>): void {
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
