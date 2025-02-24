import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { DerivedSignal, merge, MutableSignal } from "../lib/signals";
import { compact, compactObject } from "../lib/utils";
import { canComment, canWriteStorage } from "../protocol/AuthToken";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { User } from "../types/User";

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

export class ManagedOthers<P extends JsonObject, U extends BaseUserMeta> {
  // Track mutable state internally, but signal to the outside when the
  // observable derived state changes only
  readonly #internal: MutableSignal<{
    connections: Map</* connectionId */ number, Connection<U>>;
    presences: Map</* connectionId */ number, P>;
  }>;
  readonly #userCache: Map</* connectionId */ number, User<P, U>>;

  // The "clean" signal that is exposed to the outside world
  public readonly signal: DerivedSignal<readonly User<P, U>[]>;

  constructor() {
    this.#internal = new MutableSignal({
      connections: new Map</* connectionId */ number, Connection<U>>(),
      presences: new Map</* connectionId */ number, P>(),
    });

    this.signal = DerivedSignal.from(
      this.#internal,
      (_ignore): readonly User<P, U>[] =>
        compact(
          Array.from(this.#internal.get().presences.keys()).map(
            (connectionId) => this.getUser(Number(connectionId))
          )
        )
    );

    // Others
    this.#userCache = new Map();
  }

  // Shorthand for .signal.get()
  get(): readonly User<P, U>[] {
    return this.signal.get();
  }

  public connectionIds(): IterableIterator<number> {
    return this.#internal.get().connections.keys();
  }

  clearOthers(): void {
    this.#internal.mutate((state) => {
      state.connections.clear();
      state.presences.clear();
      this.#userCache.clear();
    });
  }

  #_getUser(connectionId: number): User<P, U> | undefined {
    const state = this.#internal.get();
    const conn = state.connections.get(connectionId);
    const presence = state.presences.get(connectionId);
    if (conn !== undefined && presence !== undefined) {
      return makeUser(conn, presence);
    }
    return undefined;
  }

  getUser(connectionId: number): User<P, U> | undefined {
    const cachedUser = this.#userCache.get(connectionId);
    if (cachedUser) {
      return cachedUser;
    }

    const computedUser = this.#_getUser(connectionId);
    if (computedUser) {
      this.#userCache.set(connectionId, computedUser);
      return computedUser;
    }

    return undefined;
  }

  #invalidateUser(connectionId: number): void {
    this.#userCache.delete(connectionId);
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
    this.#internal.mutate((state) => {
      state.connections.set(
        connectionId,
        freeze({
          connectionId,
          id: metaUserId,
          info: metaUserInfo,
          scopes,
        })
      );
      if (!state.presences.has(connectionId)) {
        return false;
      }
      return this.#invalidateUser(connectionId);
    });
  }

  /**
   * Removes a known connectionId. Removes both the connection's metadata and
   * the presence information.
   */
  removeConnection(connectionId: number): void {
    this.#internal.mutate((state) => {
      state.connections.delete(connectionId);
      state.presences.delete(connectionId);
      this.#invalidateUser(connectionId);
    });
  }

  /**
   * Stores a new user from a full presence update. If the user already exists,
   * its known presence data is overwritten.
   */
  setOther(connectionId: number, presence: P): void {
    this.#internal.mutate((state) => {
      state.presences.set(connectionId, freeze(compactObject(presence)));
      if (!state.connections.has(connectionId)) {
        return false;
      }
      return this.#invalidateUser(connectionId);
    });
  }

  /**
   * Patches the presence data for an existing "other". If we don't know the
   * initial presence data for this user yet, discard this patch and await the
   * full .setOther() call first.
   */
  patchOther(connectionId: number, patch: Partial<P>): void {
    this.#internal.mutate((state) => {
      const oldPresence = state.presences.get(connectionId);
      if (oldPresence === undefined) {
        return false;
      }

      const newPresence = merge(oldPresence, patch);
      if (oldPresence === newPresence) {
        return false;
      }

      state.presences.set(connectionId, freeze(newPresence));
      return this.#invalidateUser(connectionId);
    });
  }
}
