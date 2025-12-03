import type {
  AiChatsQuery,
  AsyncResult,
  BaseMetadata,
  BaseUserMeta,
  Client,
  CommentData,
  CommentReaction,
  CommentUserReaction,
  Cursor,
  DistributiveOmit,
  HistoryVersion,
  InboxNotificationData,
  InboxNotificationDeleteInfo,
  ISignal,
  MessageId,
  NotificationSettings,
  OpaqueClient,
  PartialNotificationSettings,
  Patchable,
  Permission,
  Resolve,
  RoomSubscriptionSettings,
  SubscriptionData,
  SubscriptionDeleteInfo,
  SubscriptionKey,
  ThreadData,
  ThreadDataWithDeleteInfo,
  ThreadDeleteInfo,
  UrlMetadata,
} from "@liveblocks/core";
import {
  assertNever,
  autoRetry,
  batch,
  compactObject,
  console,
  createNotificationSettings,
  DefaultMap,
  DerivedSignal,
  getSubscriptionKey,
  kInternal,
  MutableSignal,
  nanoid,
  nn,
  patchNotificationSettings,
  shallow,
  shallow2,
  Signal,
  stableStringify,
} from "@liveblocks/core";

import { ASYNC_ERR, ASYNC_LOADING, ASYNC_OK } from "./lib/AsyncResult";
import { autobind } from "./lib/autobind";
import { find } from "./lib/itertools";
import { makeInboxNotificationsFilter } from "./lib/querying";
import type { ReadonlyThreadDB } from "./ThreadDB";
import { ThreadDB } from "./ThreadDB";
import type {
  AiChatAsyncResult,
  AiChatMessagesAsyncResult,
  AiChatsAsyncResult,
  HistoryVersionsAsyncResult,
  InboxNotificationsAsyncResult,
  InboxNotificationsQuery,
  NotificationSettingsAsyncResult,
  RoomSubscriptionSettingsAsyncResult,
  ThreadsAsyncResult,
  ThreadsQuery,
  UnreadInboxNotificationsCountAsyncResult,
  UrlMetadataAsyncResult,
} from "./types";

type OptimisticUpdate<TM extends BaseMetadata, CM extends BaseMetadata> =
  | CreateThreadOptimisticUpdate<TM, CM>
  | DeleteThreadOptimisticUpdate
  | EditThreadMetadataOptimisticUpdate<TM>
  | MarkThreadAsResolvedOptimisticUpdate
  | MarkThreadAsUnresolvedOptimisticUpdate
  | SubscribeToThreadOptimisticUpdate
  | UnsubscribeFromThreadOptimisticUpdate
  | CreateCommentOptimisticUpdate<CM>
  | EditCommentOptimisticUpdate<CM>
  | DeleteCommentOptimisticUpdate
  | AddReactionOptimisticUpdate
  | RemoveReactionOptimisticUpdate
  | MarkInboxNotificationAsReadOptimisticUpdate
  | MarkAllInboxNotificationsAsReadOptimisticUpdate
  | DeleteInboxNotificationOptimisticUpdate
  | DeleteAllInboxNotificationsOptimisticUpdate
  | UpdateRoomSubscriptionSettingsOptimisticUpdate
  | UpdateNotificationSettingsOptimisticUpdate;

type CreateThreadOptimisticUpdate<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
> = {
  type: "create-thread";
  id: string;
  roomId: string;
  thread: ThreadData<TM, CM>;
};

type DeleteThreadOptimisticUpdate = {
  type: "delete-thread";
  id: string;
  roomId: string;
  threadId: string;
  deletedAt: Date;
};

type EditThreadMetadataOptimisticUpdate<TM extends BaseMetadata> = {
  type: "edit-thread-metadata";
  id: string;
  threadId: string;
  metadata: Resolve<Patchable<TM>>;
  updatedAt: Date;
};

type MarkThreadAsResolvedOptimisticUpdate = {
  type: "mark-thread-as-resolved";
  id: string;
  threadId: string;
  updatedAt: Date;
};

type MarkThreadAsUnresolvedOptimisticUpdate = {
  type: "mark-thread-as-unresolved";
  id: string;
  threadId: string;
  updatedAt: Date;
};

type SubscribeToThreadOptimisticUpdate = {
  type: "subscribe-to-thread";
  id: string;
  threadId: string;
  subscribedAt: Date;
};

type UnsubscribeFromThreadOptimisticUpdate = {
  type: "unsubscribe-from-thread";
  id: string;
  threadId: string;
  unsubscribedAt: Date;
};

type CreateCommentOptimisticUpdate<CM extends BaseMetadata> = {
  type: "create-comment";
  id: string;
  comment: CommentData<CM>;
};

type EditCommentOptimisticUpdate<CM extends BaseMetadata> = {
  type: "edit-comment";
  id: string;
  comment: CommentData<CM>;
};

type DeleteCommentOptimisticUpdate = {
  type: "delete-comment";
  id: string;
  roomId: string;
  threadId: string;
  deletedAt: Date;
  commentId: string;
};

type AddReactionOptimisticUpdate = {
  type: "add-reaction";
  id: string;
  threadId: string;
  commentId: string;
  reaction: CommentUserReaction;
};

type RemoveReactionOptimisticUpdate = {
  type: "remove-reaction";
  id: string;
  threadId: string;
  commentId: string;
  emoji: string;
  userId: string;
  removedAt: Date;
};

type MarkInboxNotificationAsReadOptimisticUpdate = {
  type: "mark-inbox-notification-as-read";
  id: string;
  inboxNotificationId: string;
  readAt: Date;
};

type MarkAllInboxNotificationsAsReadOptimisticUpdate = {
  type: "mark-all-inbox-notifications-as-read";
  id: string;
  readAt: Date;
};

type DeleteInboxNotificationOptimisticUpdate = {
  type: "delete-inbox-notification";
  id: string;
  inboxNotificationId: string;
  deletedAt: Date;
};

type DeleteAllInboxNotificationsOptimisticUpdate = {
  type: "delete-all-inbox-notifications";
  id: string;
  deletedAt: Date;
};

type UpdateRoomSubscriptionSettingsOptimisticUpdate = {
  type: "update-room-subscription-settings";
  id: string;
  roomId: string;
  userId: string;
  settings: Partial<RoomSubscriptionSettings>;
};

type UpdateNotificationSettingsOptimisticUpdate = {
  type: "update-notification-settings";
  id: string;
  settings: PartialNotificationSettings;
};

type PaginationState = {
  cursor: string | null; // If `null`, it's the last page
  hasFetchedAll: boolean;
  isFetchingMore: boolean;
  fetchMoreError?: Error;
  fetchMore: () => void;
};

/**
 * Valid combinations of field patches to the pagination state.
 */
type PaginationStatePatch =
  | { isFetchingMore: true }
  | {
      hasFetchedAll: boolean;
      isFetchingMore: false;
      cursor: string | null;
      fetchMoreError: undefined;
    }
  | { isFetchingMore: false; fetchMoreError: Error };

/**
 * Example:
 * makeRoomThreadsQueryKey('room-abc', { xyz: 123, abc: "red" })
 * → '["room-abc",{"color":"red","xyz":123}]'
 */
export function makeRoomThreadsQueryKey(
  roomId: string,
  query: ThreadsQuery<BaseMetadata> | undefined
) {
  return stableStringify([roomId, query ?? {}]);
}

export function makeUserThreadsQueryKey(
  query: ThreadsQuery<BaseMetadata> | undefined
) {
  return stableStringify(query ?? {});
}

export function makeAiChatsQueryKey(
  query: AiChatsQuery | undefined
): AiChatsQueryKey {
  return stableStringify(query ?? {});
}

export function makeInboxNotificationsQueryKey(
  query: InboxNotificationsQuery | undefined
) {
  return stableStringify(query ?? {});
}

/**
 * Like Promise<T>, except it will have a synchronously readable `status`
 * field, indicating the status of the promise.
 * This is compatible with React's `use()` promises, hence the name.
 */
type UsablePromise<T> = Promise<T> &
  (
    | { status: "pending" }
    | { status: "rejected"; reason: Error }
    | { status: "fulfilled"; value: T }
  );

/**
 * Given any Promise<T>, monkey-patches it to a UsablePromise<T>, whose
 * asynchronous status can be synchronously observed.
 */
function usify<T>(promise: Promise<T>): UsablePromise<T> {
  if ("status" in promise) {
    // Already a usable promise
    return promise as UsablePromise<T>;
  }

  const usable: UsablePromise<T> = promise as UsablePromise<T>;
  usable.status = "pending";
  usable.then(
    (value) => {
      usable.status = "fulfilled";
      (usable as UsablePromise<T> & { status: "fulfilled" }).value = value;
    },
    (err) => {
      usable.status = "rejected";
      (usable as UsablePromise<T> & { status: "rejected" }).reason =
        err as Error;
    }
  );
  return usable;
}

const noop = Promise.resolve();

/**
 * The PaginatedResource helper class is responsible for and abstracts away the
 * following:
 *
 * - It receives a "page fetch" function of the following signature:
 *     (cursor?: Cursor) => Promise<Cursor | null>
 *
 * - Note that there is no data in the returned value!!! Storing or handling
 *   the data is NOT the responsibility of this helper class. This may be a bit
 *   counter-intuitive at first. The provided page fetcher callback function
 *   should store the data elsewhere, outside of the PaginatedResource state
 *   machine, as a side-effect of this "page fetch" function, but it can always
 *   assume the happy path. This class will deal with all the required
 *   complexity for handling the non-happy path conditions.
 *
 * - This class exposes a "getter" that you can call synchronously to get the
 *   current fetching/paginationo status for this resource. It will look like
 *   the pagination hooks, except it will not contain any data. In other words,
 *   it can return any of these shapes:
 *
 *   - { isLoading: true }
 *   - {
 *       isLoading: false,
 *       error: new Error('error while fetching'),
 *     }
 *   - {
 *       isLoading: false,
 *       data: {
 *         cursor: string | null;
 *         isFetchingMore: boolean;
 *         fetchMoreError?: Error;
 *       }
 *     }
 *
 * - When calling the getter multiple times, the return value is always
 *   referentially equal to the previous call.
 *
 * - When in this error state, the error will remain in error state for
 *   5 seconds. After those 5 seconds, the resource status gets reset, and the
 *   next time the "getter" is accessed, the resource will re-initiate the
 *   initial fetching process.
 *
 * - This class exposes an Observable that is notified whenever the state
 *   changes. For now, this observable can be used to call a no-op update to
 *   the Store (eg `.set(state => ({...state})`), to trigger a re-render for
 *   all React components.
 *
 * - This class will also expose a function that can be exposed as the
 *   `fetchMore` function which can be called externally.
 *
 * - This nicely bundles the internal state that should always be mutated
 *   together to manage all the pagination state.
 *
 * - For InboxNotifications we will have one instance of this class.
 *
 * - For Threads we will have one for each query.
 *
 * ---------------------------------------------------------------------------
 *
 * NOT 100% SURE ABOUT THE FOLLOWING YET:
 *
 * - Maybe we could eventually also let this manage the "delta updates" and the
 *   "last requested at" for this resource? Seems nice to add it here somehow.
 *   Need to think about the exact implications though.
 *
 * @internal Only exported for unit tests.
 */
export class PaginatedResource {
  readonly #signal: Signal<AsyncResult<PaginationState>>;
  public readonly signal: ISignal<AsyncResult<PaginationState>>;

  #fetchPage: (cursor?: string) => Promise<string | null>;
  #pendingFetchMore: Promise<void> | null;

  constructor(fetchPage: (cursor?: string) => Promise<string | null>) {
    this.#signal = new Signal<AsyncResult<PaginationState>>(ASYNC_LOADING);
    this.#fetchPage = fetchPage;
    this.#pendingFetchMore = null;
    this.signal = this.#signal.asReadonly();

    autobind(this);
  }

  get(): AsyncResult<PaginationState> {
    return this.#signal.get();
  }

  #patch(patch: PaginationStatePatch): void {
    const state = this.#signal.get();
    if (state.data === undefined) return;
    this.#signal.set(ASYNC_OK({ ...state.data, ...patch }));
  }

  async #fetchMore(): Promise<void> {
    const state = this.#signal.get();
    if (!state.data?.cursor || state.data.isFetchingMore) {
      // Either:
      // - We don't have a cursor yet (first fetch not happened successfully yet)
      // - We don't have a cursor any longer (we're on the last page)
      return;
    }

    this.#patch({ isFetchingMore: true });
    try {
      const nextCursor = await this.#fetchPage(state.data.cursor);
      this.#patch({
        cursor: nextCursor,
        hasFetchedAll: nextCursor === null,
        fetchMoreError: undefined,
        isFetchingMore: false,
      });
    } catch (err) {
      this.#patch({
        isFetchingMore: false,
        fetchMoreError: err as Error,
      });
    }
  }

  public fetchMore(): Promise<void> {
    // We do not proceed with fetching more if any of the following is true:
    // 1) the pagination state has not be initialized
    // 2) the cursor is null, i.e., there are no more pages to fetch
    // 3) a request to fetch more is currently in progress
    const state = this.#signal.get();
    if (!state.data?.cursor) return noop;

    // Case (3)
    if (!this.#pendingFetchMore) {
      this.#pendingFetchMore = this.#fetchMore().finally(() => {
        this.#pendingFetchMore = null;
      });
    }
    return this.#pendingFetchMore;
  }

  #cachedPromise: UsablePromise<void> | null = null;

  public waitUntilLoaded(): UsablePromise<void> {
    if (this.#cachedPromise) {
      return this.#cachedPromise;
    }

    // Wrap the request to load room threads (and notifications) in an auto-retry function so that if the request fails,
    // we retry for at most 5 times with incremental backoff delays. If all retries fail, the auto-retry function throws an error
    const initialPageFetch$ = autoRetry(
      () => this.#fetchPage(/* cursor */ undefined),
      5,
      [5000, 5000, 10000, 15000]
    );

    const promise = usify(initialPageFetch$);

    // NOTE: However tempting it may be, we cannot simply move this block into
    // the promise definition above. The reason is that we should not call
    // notify() before the UsablePromise is actually in resolved status. While
    // still inside the .then() block, the UsablePromise is still in pending status.
    promise.then(
      (cursor) => {
        this.#signal.set(
          ASYNC_OK({
            cursor,
            hasFetchedAll: cursor === null,
            isFetchingMore: false,
            fetchMoreError: undefined,
            fetchMore: this.fetchMore,
          })
        );
      },
      (err) => {
        this.#signal.set(ASYNC_ERR(err as Error));

        // Wait for 5 seconds before removing the request
        setTimeout(() => {
          this.#cachedPromise = null;
          this.#signal.set(ASYNC_LOADING);
        }, 5_000);
      }
    );

    this.#cachedPromise =
      promise as UsablePromise<unknown> as UsablePromise<void>;
    return this.#cachedPromise;
  }
}

// TODO Find better name?
type LoadableResource<T> = {
  signal: ISignal<T>;
  waitUntilLoaded: () => UsablePromise<void>;
};

class SinglePageResource {
  readonly #signal: Signal<AsyncResult<void>>;
  public readonly signal: ISignal<AsyncResult<void>>;

  #fetchPage: () => Promise<void>;

  #autoRetry: boolean = true;

  constructor(fetchPage: () => Promise<void>, autoRetry: boolean = true) {
    this.#signal = new Signal<AsyncResult<void>>(ASYNC_LOADING);
    this.signal = this.#signal.asReadonly();
    this.#fetchPage = fetchPage;
    this.#autoRetry = autoRetry;

    autobind(this);
  }

  get(): AsyncResult<void> {
    return this.#signal.get();
  }

  #cachedPromise: UsablePromise<void> | null = null;

  public waitUntilLoaded(): UsablePromise<void> {
    if (this.#cachedPromise) {
      return this.#cachedPromise;
    }

    // Wrap the request to load room threads (and notifications) in an auto-retry function so that if the request fails,
    // we retry for at most 5 times with incremental backoff delays. If all retries fail, the auto-retry function throws an error
    const initialFetcher$ = this.#autoRetry
      ? autoRetry(() => this.#fetchPage(), 5, [5000, 5000, 10000, 15000])
      : this.#fetchPage();

    const promise = usify(initialFetcher$);

    // NOTE: However tempting it may be, we cannot simply move this block into
    // the promise definition above. The reason is that we should not call
    // notify() before the UsablePromise is actually in resolved status. While
    // still inside the .then() block, the UsablePromise is still in pending status.
    promise.then(
      () => {
        this.#signal.set(ASYNC_OK(undefined));
      },
      (err) => {
        this.#signal.set(ASYNC_ERR(err as Error));

        if (this.#autoRetry) {
          // Wait for 5 seconds before removing the request
          setTimeout(() => {
            this.#cachedPromise = null;
            this.#signal.set(ASYNC_LOADING);
          }, 5_000);
        }
      }
    );

    this.#cachedPromise = promise;
    return promise;
  }
}

type RoomId = string;
type UserQueryKey = string;
type RoomQueryKey = string;
type InboxNotificationsQueryKey = string;

type AiChatsQueryKey = string;

/**
 * A lookup table (LUT) for all the history versions.
 */
type VersionsLUT = DefaultMap<RoomId, Map<string, HistoryVersion>>;

/**
 * A lookup table (LUT) for all the inbox notifications.
 */
type NotificationsLUT = Map<string, InboxNotificationData>;

/**
 * A lookup table (LUT) for all the unread inbox notifications count.
 */
type UnreadInboxNotificationsCountLUT = Map<string, number>;

/**
 * A lookup table (LUT) for all the subscriptions.
 */
type SubscriptionsLUT = Map<SubscriptionKey, SubscriptionData>;

/**
 * A lookup table (LUT) for all the room subscription settings.
 */
type RoomSubscriptionSettingsLUT = Map<RoomId, RoomSubscriptionSettings>;

/**
 * Room subscription settings by room ID.
 * e.g. { 'room-abc': { threads: "all" },
 *        'room-def': { threads: "replies_and_mentions" },
 *        'room-xyz': { threads: "none" },
 *      }
 */
type RoomSubscriptionSettingsByRoomId = Record<
  RoomId,
  RoomSubscriptionSettings
>;

export type SubscriptionsByKey = Record<SubscriptionKey, SubscriptionData>;

export type CleanThreadifications<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
> =
  // Threads + Notifications = Threadifications
  CleanThreads<TM, CM> &
    //
    CleanNotifications;

export type CleanThreads<TM extends BaseMetadata, CM extends BaseMetadata> = {
  /**
   * Keep track of loading and error status of all the queries made by the client.
   * e.g. 'room-abc-{"color":"red"}'  - ok
   * e.g. 'room-abc-{}'               - loading
   */
  threadsDB: ReadonlyThreadDB<TM, CM>;
};

export type CleanNotifications = {
  /**
   * All inbox notifications in a sorted array, optimistic updates applied.
   */
  sortedNotifications: InboxNotificationData[];

  /**
   * Inbox notifications by ID.
   * e.g. `in_${string}`
   */
  notificationsById: Record<string, InboxNotificationData>;
};

export type CleanThreadSubscriptions = {
  /**
   * Thread subscriptions by key (kind + subject ID).
   * e.g. `thread:${string}`, `$custom:${string}`, etc
   */
  subscriptions: SubscriptionsByKey;

  /**
   * All inbox notifications in a sorted array, optimistic updates applied.
   *
   * `useThreadSubscription` returns the subscription status based on subscriptions
   * but also the `readAt` value of the associated notification, so we need to
   * expose the notifications here as well.
   */
  notifications: InboxNotificationData[];
};

function createStore_forNotifications() {
  const signal = new MutableSignal<NotificationsLUT>(new Map());

  function markRead(notificationId: string, readAt: Date) {
    signal.mutate((lut) => {
      const existing = lut.get(notificationId);
      if (!existing) {
        return false;
      }
      lut.set(notificationId, { ...existing, readAt });
      return true;
    });
  }

  function markAllRead(readAt: Date) {
    signal.mutate((lut) => {
      for (const n of lut.values()) {
        n.readAt = readAt;
      }
    });
  }

  function deleteOne(inboxNotificationId: string) {
    signal.mutate((lut) => lut.delete(inboxNotificationId));
  }

  function clear() {
    signal.mutate((lut) => lut.clear());
  }

  function applyDelta(
    newNotifications: InboxNotificationData[],
    deletedNotifications: InboxNotificationDeleteInfo[]
  ) {
    signal.mutate((lut) => {
      let mutated = false;

      // Add new notifications or update existing notifications if the existing notification is older than the new notification.
      for (const n of newNotifications) {
        const existing = lut.get(n.id);
        // If the notification already exists, we need to compare the two notifications to determine which one is newer.
        if (existing) {
          const result = compareInboxNotifications(existing, n);
          // If the existing notification is newer than the new notification, we do not update the existing notification.
          if (result === 1) continue;
        }

        // If the new notification is newer than the existing notification, we update the existing notification.
        lut.set(n.id, n);
        mutated = true;
      }

      for (const n of deletedNotifications) {
        lut.delete(n.id);
        mutated = true;
      }
      return mutated;
    });
  }

  function updateAssociatedNotification(newComment: CommentData) {
    signal.mutate((lut) => {
      const existing = find(
        lut.values(),
        (notification) =>
          notification.kind === "thread" &&
          notification.threadId === newComment.threadId
      );
      if (!existing) return false; // Nothing to udate here

      // If the thread has an inbox notification associated with it, we update the notification's `notifiedAt` and `readAt` values
      lut.set(existing.id, {
        ...existing,
        notifiedAt: newComment.createdAt,
        readAt: newComment.createdAt,
      });
      return true;
    });
  }

  function upsert(notification: InboxNotificationData) {
    signal.mutate((lut) => {
      lut.set(notification.id, notification);
    });
  }

  return {
    signal: signal.asReadonly(),

    // Mutations
    markAllRead,
    markRead,
    delete: deleteOne,
    applyDelta,
    clear,
    updateAssociatedNotification,
    upsert,
  };
}

function createStore_forUnreadNotificationsCount() {
  const baseSignal = new MutableSignal<UnreadInboxNotificationsCountLUT>(
    new Map()
  );

  function update(queryKey: InboxNotificationsQueryKey, count: number): void {
    baseSignal.mutate((lut) => {
      lut.set(queryKey, count);
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, (c) => Object.fromEntries(c)),

    // Mutations
    update,
  };
}

function createStore_forSubscriptions(
  updates: ISignal<readonly OptimisticUpdate<BaseMetadata, BaseMetadata>[]>,
  threads: ReadonlyThreadDB<BaseMetadata, BaseMetadata>
) {
  const baseSignal = new MutableSignal<SubscriptionsLUT>(new Map());

  function applyDelta(
    newSubscriptions: SubscriptionData[],
    deletedSubscriptions: SubscriptionDeleteInfo[]
  ) {
    baseSignal.mutate((lut) => {
      let mutated = false;

      for (const s of newSubscriptions) {
        lut.set(getSubscriptionKey(s), s);
        mutated = true;
      }

      for (const s of deletedSubscriptions) {
        lut.delete(getSubscriptionKey(s));
        mutated = true;
      }

      return mutated;
    });
  }

  function create(subscription: SubscriptionData) {
    baseSignal.mutate((lut) => {
      lut.set(getSubscriptionKey(subscription), subscription);
    });
  }

  function deleteOne(subscriptionKey: SubscriptionKey) {
    baseSignal.mutate((lut) => {
      lut.delete(subscriptionKey);
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, updates, (base, updates) =>
      applyOptimisticUpdates_forSubscriptions(base, threads, updates)
    ),

    // Mutations
    applyDelta,
    create,
    delete: deleteOne,
  };
}

function createStore_forRoomSubscriptionSettings(
  updates: ISignal<readonly OptimisticUpdate<BaseMetadata, BaseMetadata>[]>
) {
  const baseSignal = new MutableSignal<RoomSubscriptionSettingsLUT>(new Map());

  function update(roomId: string, settings: RoomSubscriptionSettings): void {
    baseSignal.mutate((lut) => {
      lut.set(roomId, settings);
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, updates, (base, updates) =>
      applyOptimisticUpdates_forRoomSubscriptionSettings(base, updates)
    ),

    // Mutations
    update,
  };
}

function createStore_forHistoryVersions() {
  const baseSignal = new MutableSignal(
    new DefaultMap(() => new Map()) as VersionsLUT
  );

  function update(roomId: string, versions: HistoryVersion[]): void {
    baseSignal.mutate((lut) => {
      const versionsById = lut.getOrCreate(roomId);
      for (const version of versions) {
        versionsById.set(version.id, version);
      }
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, (hv) =>
      Object.fromEntries(
        [...hv].map(([roomId, versions]) => [
          roomId,
          Object.fromEntries(versions),
        ])
      )
    ),

    // Mutations
    update,
  };
}

function createStore_forUrlsMetadata() {
  const baseSignal = new MutableSignal<Map<string, UrlMetadata>>(new Map());

  function update(url: string, metadata: UrlMetadata): void {
    baseSignal.mutate((lut) => {
      lut.set(url, metadata);
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, (m) => Object.fromEntries(m)),

    // Mutations
    update,
  };
}

function createStore_forPermissionHints() {
  const permissionsByRoomId = new DefaultMap(
    () => new Signal<Set<Permission>>(new Set())
  );

  function update(newHints: Record<string, Permission[]>) {
    batch(() => {
      for (const [roomId, permissions] of Object.entries(newHints)) {
        const signal = permissionsByRoomId.getOrCreate(roomId);
        // Get the existing set of permissions for the room and only ever add permission to this set
        const existingPermissions = new Set(signal.get());
        for (const permission of permissions) {
          existingPermissions.add(permission);
        }
        signal.set(existingPermissions);
      }
    });
  }

  function getPermissionForRoomΣ(roomId: string): ISignal<Set<Permission>> {
    return permissionsByRoomId.getOrCreate(roomId);
  }

  return {
    getPermissionForRoomΣ,

    // Mutations
    update,
  };
}

/**
 * Notification settings
 *
 * e.g.
 *  {
 *    email: {
 *      thread: true,
 *      textMention: false,
 *      $customKind: true | false,
 *    }
 *    slack: {
 *      thread: true,
 *      textMention: false,
 *      $customKind: true | false,
 *    }
 *  }
 * e.g. {} when before the first successful fetch.
 */
function createStore_forNotificationSettings(
  updates: ISignal<readonly OptimisticUpdate<BaseMetadata, BaseMetadata>[]>
) {
  const signal = new Signal<NotificationSettings>(
    createNotificationSettings({})
  );

  function update(settings: NotificationSettings) {
    signal.set(settings);
  }

  return {
    signal: DerivedSignal.from(signal, updates, (base, updates) =>
      applyOptimisticUpdates_forNotificationSettings(base, updates)
    ),
    // Mutations
    update,
  };
}

function createStore_forOptimistic<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(client: Client<BaseUserMeta, TM, CM>) {
  const signal = new Signal<readonly OptimisticUpdate<TM, CM>[]>([]);
  const syncSource = client[kInternal].createSyncSource();

  // Automatically update the global sync status as an effect whenever there
  // are any optimistic updates
  signal.subscribe(() =>
    syncSource.setSyncStatus(
      signal.get().length > 0 ? "synchronizing" : "synchronized"
    )
  );

  function add(
    optimisticUpdate: DistributiveOmit<OptimisticUpdate<TM, CM>, "id">
  ): string {
    const id = nanoid();
    const newUpdate: OptimisticUpdate<TM, CM> = { ...optimisticUpdate, id };
    signal.set((state) => [...state, newUpdate]);
    return id;
  }

  function remove(optimisticId: string): void {
    signal.set((state) => state.filter((ou) => ou.id !== optimisticId));
  }

  return {
    signal: signal.asReadonly(),

    // Mutations
    add,
    remove,
  };
}

export class UmbrellaStore<TM extends BaseMetadata, CM extends BaseMetadata> {
  #client: Client<BaseUserMeta, TM, CM>;

  //
  // Internally, the UmbrellaStore keeps track of a few source signals that can
  // be set and mutated individually. When any of those are mutated then the
  // clean "external state" is recomputed.
  //
  //   Mutate inputs...                                             ...observe clean/consistent output!
  //
  //            .-> Base ThreadDB ---------+                 +-------> Clean threads by ID         (Part 1)
  //           /                           |                 |
  //   mutate ----> Base Notifications --+ |                 | +-----> Clean notifications         (Part 1)
  //          \                          | |                 | |       & notifications by ID
  //         | \                         | |      Apply      | |
  //         |   `-> OptimisticUpdates --+--+--> Optimistic -+-+-+-+-> Subscriptions               (Part 2)
  //          \                          |        Updates    |   | |
  //           `------- etc etc ---------+                   |   | +-> History Versions            (Part 3)
  //                       ^                                 |   |
  //                       |                                 |   +---> Room Subscription Settings  (Part 4)
  //                       |                                 |
  //                       |                                 +-------> Notification Settings       (Part 5)
  //                       |
  //                       |
  //                       |                        ^                  ^
  //                    Signal                      |                  |
  //                      or                   DerivedSignal      DerivedSignals
  //                  MutableSignal
  //

  //
  // Input signals.
  // (Can be mutated directly.)
  //
  // XXX_vincent Now that we have createStore_forX, we should probably also change
  // `threads` to this pattern, ie create a createStore_forThreads helper as
  // well. It almost works like that already anyway!
  readonly threads: ThreadDB<TM, CM>; // Exposes its signal under `.signal` prop
  readonly notifications: ReturnType<typeof createStore_forNotifications>;
  readonly subscriptions: ReturnType<typeof createStore_forSubscriptions>;
  readonly roomSubscriptionSettings: ReturnType<typeof createStore_forRoomSubscriptionSettings>; // prettier-ignore
  readonly historyVersions: ReturnType<typeof createStore_forHistoryVersions>;
  readonly unreadNotificationsCount: ReturnType<
    typeof createStore_forUnreadNotificationsCount
  >;
  readonly urlsMetadata: ReturnType<typeof createStore_forUrlsMetadata>;
  readonly permissionHints: ReturnType<typeof createStore_forPermissionHints>;
  readonly notificationSettings: ReturnType<
    typeof createStore_forNotificationSettings
  >;
  readonly optimisticUpdates: ReturnType<
    typeof createStore_forOptimistic<TM, CM>
  >;

  //
  // Output signals.
  // (Readonly, clean, consistent. With optimistic updates applied.)
  //
  // Note that the output of threadifications signal is the same as the ones for
  // threads and notifications separately, but the threadifications signal will
  // be updated whenever either of them change.
  //
  readonly outputs: {
    readonly threadifications: DerivedSignal<CleanThreadifications<TM, CM>>;
    readonly threads: DerivedSignal<ReadonlyThreadDB<TM, CM>>;
    readonly loadingRoomThreads: DefaultMap<
      RoomQueryKey,
      LoadableResource<ThreadsAsyncResult<TM, CM>>
    >;
    readonly loadingUserThreads: DefaultMap<
      UserQueryKey,
      LoadableResource<ThreadsAsyncResult<TM, CM>>
    >;
    readonly notifications: DerivedSignal<CleanNotifications>;
    readonly threadSubscriptions: DerivedSignal<CleanThreadSubscriptions>;

    readonly loadingNotifications: DefaultMap<
      InboxNotificationsQueryKey,
      LoadableResource<InboxNotificationsAsyncResult>
    >;
    readonly unreadNotificationsCount: DefaultMap<
      InboxNotificationsQueryKey,
      LoadableResource<UnreadInboxNotificationsCountAsyncResult>
    >;
    readonly roomSubscriptionSettingsByRoomId: DefaultMap<
      RoomId,
      LoadableResource<RoomSubscriptionSettingsAsyncResult>
    >;
    readonly versionsByRoomId: DefaultMap<
      RoomId,
      LoadableResource<HistoryVersionsAsyncResult>
    >;
    readonly notificationSettings: LoadableResource<NotificationSettingsAsyncResult>;
    readonly aiChats: DefaultMap<
      AiChatsQueryKey,
      LoadableResource<AiChatsAsyncResult>
    >;
    readonly messagesByChatId: DefaultMap<
      string,
      DefaultMap<MessageId | null, LoadableResource<AiChatMessagesAsyncResult>>
    >;
    readonly aiChatById: DefaultMap<
      string,
      LoadableResource<AiChatAsyncResult>
    >;
    readonly urlMetadataByUrl: DefaultMap<
      string,
      LoadableResource<UrlMetadataAsyncResult>
    >;
  };

  // Notifications
  #notificationsLastRequestedAt: Date | null = null; // Keeps track of when we successfully requested an inbox notifications update for the last time. Will be `null` as long as the first successful fetch hasn't happened yet.

  // Room Threads
  #roomThreadsLastRequestedAtByRoom = new Map<RoomId, Date>();

  // User Threads
  #userThreadsLastRequestedAt: Date | null = null;

  // Room versions
  #roomVersionsLastRequestedAtByRoom = new Map<RoomId, Date>();

  // Notification Settings
  #notificationSettings: SinglePageResource;

  constructor(client: OpaqueClient) {
    this.#client = client[kInternal].as<TM, CM>();

    this.optimisticUpdates = createStore_forOptimistic<TM, CM>(this.#client);
    this.permissionHints = createStore_forPermissionHints();

    const notificationSettingsFetcher = async (): Promise<void> => {
      const result = await this.#client.getNotificationSettings();
      this.notificationSettings.update(result);
    };

    this.notificationSettings = createStore_forNotificationSettings(
      this.optimisticUpdates.signal
    );

    this.#notificationSettings = new SinglePageResource(
      notificationSettingsFetcher
    );

    this.threads = new ThreadDB();

    this.subscriptions = createStore_forSubscriptions(
      this.optimisticUpdates.signal,
      this.threads
    );

    this.notifications = createStore_forNotifications();
    this.roomSubscriptionSettings = createStore_forRoomSubscriptionSettings(
      this.optimisticUpdates.signal
    );
    this.historyVersions = createStore_forHistoryVersions();
    this.unreadNotificationsCount = createStore_forUnreadNotificationsCount();
    this.urlsMetadata = createStore_forUrlsMetadata();

    const threadifications = DerivedSignal.from(
      this.threads.signal,
      this.notifications.signal,
      this.optimisticUpdates.signal,
      (ts, ns, updates) =>
        applyOptimisticUpdates_forThreadifications(ts, ns, updates)
    );

    const threads = DerivedSignal.from(threadifications, (s) => s.threadsDB);

    const notifications = DerivedSignal.from(
      threadifications,
      (s) => ({
        sortedNotifications: s.sortedNotifications,
        notificationsById: s.notificationsById,
      }),
      shallow
    );

    const threadSubscriptions = DerivedSignal.from(
      notifications,
      this.subscriptions.signal,
      (n, s) => ({
        subscriptions: s,
        notifications: n.sortedNotifications,
      })
    );

    const loadingUserThreads = new DefaultMap(
      (
        queryKey: UserQueryKey
      ): LoadableResource<ThreadsAsyncResult<TM, CM>> => {
        const query = JSON.parse(queryKey) as ThreadsQuery<TM>;

        const resource = new PaginatedResource(async (cursor?: string) => {
          const result = await this.#client[
            kInternal
          ].httpClient.getUserThreads_experimental({
            cursor,
            query,
          });
          this.updateThreadifications(
            result.threads,
            result.inboxNotifications,
            result.subscriptions
          );

          this.permissionHints.update(result.permissionHints);

          // We initialize the `_userThreadsLastRequestedAt` date using the server timestamp after we've loaded the first page of inbox notifications.
          if (this.#userThreadsLastRequestedAt === null) {
            this.#userThreadsLastRequestedAt = result.requestedAt;
          }

          return result.nextCursor;
        });

        const signal = DerivedSignal.from((): ThreadsAsyncResult<TM, CM> => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          }

          const subscriptions = threadSubscriptions.get().subscriptions;

          const threads = this.outputs.threads.get().findMany(
            undefined, // Do _not_ filter by roomId
            query ?? {},
            "desc",
            subscriptions
          );

          const page = result.data;
          return {
            isLoading: false,
            threads,
            hasFetchedAll: page.hasFetchedAll,
            isFetchingMore: page.isFetchingMore,
            fetchMoreError: page.fetchMoreError,
            fetchMore: page.fetchMore,
          };
        }, shallow2);

        return { signal, waitUntilLoaded: resource.waitUntilLoaded };
      }
    );

    const loadingRoomThreads = new DefaultMap(
      (
        queryKey: RoomQueryKey
      ): LoadableResource<ThreadsAsyncResult<TM, CM>> => {
        const [roomId, query] = JSON.parse(queryKey) as [
          roomId: RoomId,
          query: ThreadsQuery<TM>,
        ];

        const resource = new PaginatedResource(async (cursor?: string) => {
          const result = await this.#client[kInternal].httpClient.getThreads({
            roomId,
            cursor,
            query,
          });
          this.updateThreadifications(
            result.threads,
            result.inboxNotifications,
            result.subscriptions
          );

          this.permissionHints.update(result.permissionHints);

          const lastRequestedAt =
            this.#roomThreadsLastRequestedAtByRoom.get(roomId);

          /**
           * We set the `lastRequestedAt` value for the room to the timestamp returned by the current request if:
           * 1. The `lastRequestedAt` value for the room has not been set
           * OR
           * 2. The `lastRequestedAt` value for the room is older than the timestamp returned by the current request
           */
          if (
            lastRequestedAt === undefined ||
            lastRequestedAt > result.requestedAt
          ) {
            this.#roomThreadsLastRequestedAtByRoom.set(
              roomId,
              result.requestedAt
            );
          }

          return result.nextCursor;
        });

        const signal = DerivedSignal.from((): ThreadsAsyncResult<TM, CM> => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          }

          const subscriptions = threadSubscriptions.get().subscriptions;

          const threads = this.outputs.threads
            .get()
            .findMany(roomId, query ?? {}, "asc", subscriptions);

          const page = result.data;
          return {
            isLoading: false,
            threads,
            hasFetchedAll: page.hasFetchedAll,
            isFetchingMore: page.isFetchingMore,
            fetchMoreError: page.fetchMoreError,
            fetchMore: page.fetchMore,
          };
        }, shallow2);

        return { signal, waitUntilLoaded: resource.waitUntilLoaded };
      }
    );

    const loadingNotifications = new DefaultMap(
      (
        queryKey: InboxNotificationsQueryKey
      ): LoadableResource<InboxNotificationsAsyncResult> => {
        const query = JSON.parse(queryKey) as InboxNotificationsQuery;

        const resource = new PaginatedResource(async (cursor?: string) => {
          const result = await this.#client.getInboxNotifications({
            cursor,
            query,
          });

          this.updateThreadifications(
            result.threads,
            result.inboxNotifications,
            result.subscriptions
          );

          // We initialize the `_lastRequestedNotificationsAt` date using the server timestamp after we've loaded the first page of inbox notifications.
          if (this.#notificationsLastRequestedAt === null) {
            this.#notificationsLastRequestedAt = result.requestedAt;
          }

          const nextCursor = result.nextCursor;
          return nextCursor;
        });

        const signal = DerivedSignal.from((): InboxNotificationsAsyncResult => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          }

          const crit: ((
            inboxNotification: InboxNotificationData
          ) => boolean)[] = [];

          if (query !== undefined) {
            crit.push(makeInboxNotificationsFilter(query));
          }
          const inboxNotifications = this.outputs.notifications
            .get()
            .sortedNotifications.filter((inboxNotification) =>
              crit.every((pred) => pred(inboxNotification))
            );

          const page = result.data;
          return {
            isLoading: false,
            inboxNotifications,
            hasFetchedAll: page.hasFetchedAll,
            isFetchingMore: page.isFetchingMore,
            fetchMoreError: page.fetchMoreError,
            fetchMore: page.fetchMore,
          };
        }, shallow2);

        return {
          signal,
          waitUntilLoaded: resource.waitUntilLoaded,
        };
      }
    );

    const unreadNotificationsCount = new DefaultMap(
      (
        queryKey: InboxNotificationsQueryKey
      ): LoadableResource<UnreadInboxNotificationsCountAsyncResult> => {
        const query = JSON.parse(queryKey) as InboxNotificationsQuery;

        const resource = new SinglePageResource(async () => {
          const result = await this.#client.getUnreadInboxNotificationsCount({
            query,
          });

          this.unreadNotificationsCount.update(queryKey, result);
        });

        const signal = DerivedSignal.from(
          (): UnreadInboxNotificationsCountAsyncResult => {
            const result = resource.get();
            if (result.isLoading || result.error) {
              return result;
            } else {
              return ASYNC_OK(
                "count",
                nn(this.unreadNotificationsCount.signal.get()[queryKey])
              );
            }
          },
          shallow
        );

        return {
          signal,
          waitUntilLoaded: resource.waitUntilLoaded,
        };
      }
    );

    const roomSubscriptionSettingsByRoomId = new DefaultMap(
      (roomId: RoomId) => {
        const resource = new SinglePageResource(async () => {
          const room = this.#client.getRoom(roomId);
          if (room === null) {
            throw new Error(`Room '${roomId}' is not available on client`);
          }

          const result = await room.getSubscriptionSettings();
          this.roomSubscriptionSettings.update(roomId, result);
        });

        const signal = DerivedSignal.from(() => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          } else {
            return ASYNC_OK(
              "settings",
              nn(this.roomSubscriptionSettings.signal.get()[roomId])
            );
          }
        }, shallow);

        return { signal, waitUntilLoaded: resource.waitUntilLoaded };
      }
    );

    const versionsByRoomId = new DefaultMap(
      (roomId: RoomId): LoadableResource<HistoryVersionsAsyncResult> => {
        const resource = new SinglePageResource(async () => {
          const room = this.#client.getRoom(roomId);
          if (room === null) {
            throw new Error(`Room '${roomId}' is not available on client`);
          }

          const result = await room[kInternal].listTextVersions();
          this.historyVersions.update(roomId, result.versions);

          const lastRequestedAt =
            this.#roomVersionsLastRequestedAtByRoom.get(roomId);

          if (
            lastRequestedAt === undefined ||
            lastRequestedAt > result.requestedAt
          ) {
            this.#roomVersionsLastRequestedAtByRoom.set(
              roomId,
              result.requestedAt
            );
          }
        });

        const signal = DerivedSignal.from((): HistoryVersionsAsyncResult => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          } else {
            return ASYNC_OK(
              "versions",
              Object.values(this.historyVersions.signal.get()[roomId] ?? {})
            );
          }
        }, shallow);

        return { signal, waitUntilLoaded: resource.waitUntilLoaded };
      }
    );

    const notificationSettings: LoadableResource<NotificationSettingsAsyncResult> =
      {
        signal: DerivedSignal.from((): NotificationSettingsAsyncResult => {
          const result = this.#notificationSettings.get();
          if (result.isLoading || result.error) {
            return result;
          }

          return ASYNC_OK(
            "settings",
            nn(this.notificationSettings.signal.get())
          );
        }, shallow),
        waitUntilLoaded: this.#notificationSettings.waitUntilLoaded,
      };

    const aiChats = new DefaultMap(
      (queryKey: AiChatsQueryKey): LoadableResource<AiChatsAsyncResult> => {
        const query = JSON.parse(queryKey) as AiChatsQuery;
        const resource = new PaginatedResource(async (cursor?: string) => {
          const result = await this.#client[kInternal].ai.getChats({
            cursor: cursor as Cursor,
            query,
          });
          return result.nextCursor;
        });

        const signal = DerivedSignal.from((): AiChatsAsyncResult => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          }

          const chats = this.#client[kInternal].ai.queryChats(query);

          return {
            isLoading: false,
            chats,
            hasFetchedAll: result.data.hasFetchedAll,
            isFetchingMore: result.data.isFetchingMore,
            fetchMore: result.data.fetchMore,
            fetchMoreError: result.data.fetchMoreError,
          };
        }, shallow);

        return { signal, waitUntilLoaded: resource.waitUntilLoaded };
      }
    );

    const messagesByChatId = new DefaultMap((chatId: string) => {
      const resourceΣ = new SinglePageResource(async () => {
        await this.#client[kInternal].ai.getMessageTree(chatId);
      });

      return new DefaultMap(
        (
          branch: MessageId | null
        ): LoadableResource<AiChatMessagesAsyncResult> => {
          const signal = DerivedSignal.from((): AiChatMessagesAsyncResult => {
            const result = resourceΣ.get();
            if (result.isLoading || result.error) {
              return result;
            }

            return ASYNC_OK(
              "messages",
              this.#client[kInternal].ai.signals
                .getChatMessagesForBranchΣ(chatId, branch ?? undefined)
                .get()
            );
          });

          return { signal, waitUntilLoaded: resourceΣ.waitUntilLoaded };
        }
      );
    });

    const aiChatById = new DefaultMap((chatId: string) => {
      const resource = new SinglePageResource(async () => {
        await this.#client[kInternal].ai.getOrCreateChat(chatId);
      });

      const signal = DerivedSignal.from(() => {
        const chat = this.#client[kInternal].ai.getChatById(chatId);
        if (chat === undefined) {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          } else {
            return ASYNC_OK(
              "chat",
              nn(this.#client[kInternal].ai.getChatById(chatId))
            );
          }
        } else {
          return ASYNC_OK(
            "chat",
            nn(this.#client[kInternal].ai.getChatById(chatId))
          );
        }
      }, shallow);

      return { signal, waitUntilLoaded: resource.waitUntilLoaded };
    });

    const urlMetadataByUrl = new DefaultMap(
      (url: string): LoadableResource<UrlMetadataAsyncResult> => {
        const resource = new SinglePageResource(async () => {
          const metadata =
            await this.#client[kInternal].httpClient.getUrlMetadata(url);
          this.urlsMetadata.update(url, metadata);
        }, false);

        const signal = DerivedSignal.from((): UrlMetadataAsyncResult => {
          const result = resource.get();
          if (result.isLoading || result.error) {
            return result;
          }

          return ASYNC_OK("metadata", nn(this.urlsMetadata.signal.get()[url]));
        }, shallow);

        return { signal, waitUntilLoaded: resource.waitUntilLoaded };
      }
    );

    this.outputs = {
      threadifications,
      threads,
      loadingRoomThreads,
      loadingUserThreads,
      notifications,
      loadingNotifications,
      unreadNotificationsCount,
      roomSubscriptionSettingsByRoomId,
      versionsByRoomId,
      notificationSettings,
      threadSubscriptions,
      aiChats,
      messagesByChatId,
      aiChatById,
      urlMetadataByUrl,
    };

    // Auto-bind all of this class' methods here, so we can use stable
    // references to them (most important for use in useSyncExternalStore)
    autobind(this);
  }

  /**
   * Updates an existing inbox notification with a new value, replacing the
   * corresponding optimistic update.
   *
   * This will not update anything if the inbox notification ID isn't found.
   */
  public markInboxNotificationRead(
    inboxNotificationId: string,
    readAt: Date,
    optimisticId: string
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.notifications.markRead(inboxNotificationId, readAt);
    });
  }

  public markAllInboxNotificationsRead(
    optimisticId: string,
    readAt: Date
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.notifications.markAllRead(readAt);
    });
  }

  /**
   * Deletes an existing inbox notification, replacing the corresponding
   * optimistic update.
   */
  public deleteInboxNotification(
    inboxNotificationId: string,
    optimisticId: string
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.notifications.delete(inboxNotificationId);
    });
  }

  /**
   * Deletes *all* inbox notifications, replacing the corresponding optimistic
   * update.
   */
  public deleteAllInboxNotifications(optimisticId: string): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.notifications.clear();
    });
  }

  /**
   * Creates an existing subscription, replacing the corresponding
   * optimistic update.
   */
  public createSubscription(
    subscription: SubscriptionData,
    optimisticId: string
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.subscriptions.create(subscription);
    });
  }

  /**
   * Deletes an existing subscription, replacing the corresponding
   * optimistic update.
   */
  public deleteSubscription(
    subscriptionKey: SubscriptionKey,
    optimisticId: string
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.subscriptions.delete(subscriptionKey);
    });
  }

  /**
   * Creates an new thread, replacing the corresponding optimistic update.
   */
  public createThread(
    optimisticId: string,
    thread: Readonly<ThreadDataWithDeleteInfo<TM, CM>>
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.threads.upsert(thread);
    });
  }

  /**
   * Updates an existing thread with a new value, replacing the corresponding
   * optimistic update.
   *
   * This will not update anything if:
   * - The thread ID isn't found; or
   * - The thread ID was already deleted; or
   * - The thread ID was updated more recently than the optimistic update's
   *   timestamp (if given)
   */
  #updateThread(
    threadId: string,
    optimisticId: string | null,
    callback: (
      thread: Readonly<ThreadDataWithDeleteInfo<TM, CM>>
    ) => Readonly<ThreadDataWithDeleteInfo<TM, CM>>,
    updatedAt?: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    batch(() => {
      if (optimisticId !== null) {
        this.optimisticUpdates.remove(optimisticId);
      }

      const db = this.threads;
      const existing = db.get(threadId);
      if (!existing) return;
      if (!!updatedAt && existing.updatedAt > updatedAt) return;
      db.upsert(callback(existing));
    });
  }

  public patchThread(
    threadId: string,
    optimisticId: string | null,
    patch: {
      // Only these fields are currently supported to patch
      metadata?: TM;
      resolved?: boolean;
    },
    updatedAt: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    return this.#updateThread(
      threadId,
      optimisticId,
      (thread) => ({ ...thread, ...compactObject(patch) }),
      updatedAt
    );
  }

  public addReaction(
    threadId: string,
    optimisticId: string | null,
    commentId: string,
    reaction: CommentUserReaction,
    createdAt: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    this.#updateThread(
      threadId,
      optimisticId,
      (thread) => applyAddReaction(thread, commentId, reaction),
      createdAt
    );
  }

  public removeReaction(
    threadId: string,
    optimisticId: string | null,
    commentId: string,
    emoji: string,
    userId: string,
    removedAt: Date
  ): void {
    this.#updateThread(
      threadId,
      optimisticId,
      (thread) =>
        applyRemoveReaction(thread, commentId, emoji, userId, removedAt),
      removedAt
    );
  }

  /**
   * Soft-deletes an existing thread by setting its `deletedAt` value,
   * replacing the corresponding optimistic update.
   *
   * This will not update anything if:
   * - The thread ID isn't found; or
   * - The thread ID was already deleted
   */
  public deleteThread(threadId: string, optimisticId: string | null): void {
    return this.#updateThread(
      threadId,
      optimisticId,

      // A deletion is actually an update of the deletedAt property internally
      (thread) => ({ ...thread, updatedAt: new Date(), deletedAt: new Date() })
    );
  }

  /**
   * Creates an existing comment and ensures the associated notification is
   * updated correctly, replacing the corresponding optimistic update.
   */
  public createComment(
    newComment: CommentData<CM>,
    optimisticId: string
  ): void {
    // Batch 1️⃣ + 2️⃣ + 3️⃣
    batch(() => {
      // 1️⃣
      this.optimisticUpdates.remove(optimisticId);

      // If the associated thread is not found, we cannot create a comment under it
      const existingThread = this.threads.get(newComment.threadId);
      if (!existingThread) {
        return;
      }

      // 2️⃣ Update the thread instance by adding a comment under it
      this.threads.upsert(applyUpsertComment(existingThread, newComment));

      // 3️⃣ Update the associated inbox notification (if any)
      this.notifications.updateAssociatedNotification(newComment);
    });
  }

  public editComment(
    threadId: string,
    optimisticId: string,
    editedComment: CommentData<CM>
  ): void {
    return this.#updateThread(threadId, optimisticId, (thread) =>
      applyUpsertComment(thread, editedComment)
    );
  }

  public deleteComment(
    threadId: string,
    optimisticId: string,
    commentId: string,
    deletedAt: Date
  ): void {
    return this.#updateThread(
      threadId,
      optimisticId,
      (thread) => applyDeleteComment(thread, commentId, deletedAt),
      deletedAt
    );
  }

  public updateThreadifications(
    threads: ThreadData<TM, CM>[],
    notifications: InboxNotificationData[],
    subscriptions: SubscriptionData[],
    deletedThreads: ThreadDeleteInfo[] = [],
    deletedNotifications: InboxNotificationDeleteInfo[] = [],
    deletedSubscriptions: SubscriptionDeleteInfo[] = []
  ): void {
    batch(() => {
      this.threads.applyDelta(threads, deletedThreads);
      this.notifications.applyDelta(notifications, deletedNotifications);
      this.subscriptions.applyDelta(subscriptions, deletedSubscriptions);
    });
  }

  /**
   * Updates existing subscription settings for a room with a new value,
   * replacing the corresponding optimistic update.
   */
  public updateRoomSubscriptionSettings(
    roomId: string,
    optimisticId: string,
    settings: Readonly<RoomSubscriptionSettings>
  ): void {
    batch(() => {
      this.optimisticUpdates.remove(optimisticId);
      this.roomSubscriptionSettings.update(roomId, settings);
    });
  }

  public async fetchNotificationsDeltaUpdate(signal: AbortSignal) {
    const lastRequestedAt = this.#notificationsLastRequestedAt;
    if (lastRequestedAt === null) {
      return;
    }

    const result = await this.#client.getInboxNotificationsSince({
      since: lastRequestedAt,
      signal,
    });

    if (lastRequestedAt < result.requestedAt) {
      this.#notificationsLastRequestedAt = result.requestedAt;
    }

    this.updateThreadifications(
      result.threads.updated,
      result.inboxNotifications.updated,
      result.subscriptions.updated,
      result.threads.deleted,
      result.inboxNotifications.deleted,
      result.subscriptions.deleted
    );
  }

  public async fetchUnreadNotificationsCount(
    queryKey: InboxNotificationsQueryKey,
    signal: AbortSignal
  ) {
    const query = JSON.parse(queryKey) as InboxNotificationsQuery;

    const result = await this.#client.getUnreadInboxNotificationsCount({
      query,
      signal,
    });

    this.unreadNotificationsCount.update(queryKey, result);
  }

  public async fetchRoomThreadsDeltaUpdate(
    roomId: string,
    signal: AbortSignal
  ) {
    const lastRequestedAt = this.#roomThreadsLastRequestedAtByRoom.get(roomId);
    if (lastRequestedAt === undefined) {
      return;
    }

    const updates = await this.#client[kInternal].httpClient.getThreadsSince({
      roomId,
      since: lastRequestedAt,
      signal,
    });

    this.updateThreadifications(
      updates.threads.updated,
      updates.inboxNotifications.updated,
      updates.subscriptions.updated,
      updates.threads.deleted,
      updates.inboxNotifications.deleted,
      updates.subscriptions.deleted
    );

    this.permissionHints.update(updates.permissionHints);

    if (lastRequestedAt < updates.requestedAt) {
      // Update the `lastRequestedAt` value for the room to the timestamp returned by the current request
      this.#roomThreadsLastRequestedAtByRoom.set(roomId, updates.requestedAt);
    }
  }

  public async fetchUserThreadsDeltaUpdate(signal: AbortSignal) {
    const lastRequestedAt = this.#userThreadsLastRequestedAt;
    if (lastRequestedAt === null) {
      return;
    }

    const result = await this.#client[
      kInternal
    ].httpClient.getUserThreadsSince_experimental({
      since: lastRequestedAt,
      signal,
    });

    if (lastRequestedAt < result.requestedAt) {
      this.#notificationsLastRequestedAt = result.requestedAt;
    }

    this.updateThreadifications(
      result.threads.updated,
      result.inboxNotifications.updated,
      result.subscriptions.updated,
      result.threads.deleted,
      result.inboxNotifications.deleted,
      result.subscriptions.deleted
    );

    this.permissionHints.update(result.permissionHints);
  }

  public async fetchRoomVersionsDeltaUpdate(
    roomId: string,
    signal: AbortSignal
  ) {
    const lastRequestedAt = this.#roomVersionsLastRequestedAtByRoom.get(roomId);
    if (lastRequestedAt === undefined) {
      return;
    }

    const room = nn(
      this.#client.getRoom(roomId),
      `Room with id ${roomId} is not available on client`
    );

    const updates = await room[kInternal].listTextVersionsSince({
      since: lastRequestedAt,
      signal,
    });

    this.historyVersions.update(roomId, updates.versions);

    if (lastRequestedAt < updates.requestedAt) {
      // Update the `lastRequestedAt` value for the room to the timestamp returned by the current request
      this.#roomVersionsLastRequestedAtByRoom.set(roomId, updates.requestedAt);
    }
  }

  public async refreshRoomSubscriptionSettings(
    roomId: string,
    signal: AbortSignal
  ) {
    const room = nn(
      this.#client.getRoom(roomId),
      `Room with id ${roomId} is not available on client`
    );
    const result = await room.getSubscriptionSettings({ signal });
    this.roomSubscriptionSettings.update(roomId, result);
  }

  /**
   * Refresh notification settings from poller
   */
  public async refreshNotificationSettings(signal: AbortSignal) {
    const result = await this.#client.getNotificationSettings({
      signal,
    });
    this.notificationSettings.update(result);
  }

  /**
   * Updates notification settings with a new value, replacing the
   * corresponding optimistic update.
   */
  public updateNotificationSettings_confirmOptimisticUpdate(
    settings: NotificationSettings,
    optimisticUpdateId: string
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.optimisticUpdates.remove(optimisticUpdateId); // 1️⃣
      this.notificationSettings.update(settings); // 2️⃣
    });
  }
}

/**
 * Applies optimistic updates, removes deleted threads, sorts results in
 * a stable way, removes internal fields that should not be exposed publicly.
 */
function applyOptimisticUpdates_forThreadifications<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  baseThreadsDB: ThreadDB<TM, CM>,
  notificationsLUT: NotificationsLUT,
  optimisticUpdates: readonly OptimisticUpdate<TM, CM>[]
): CleanThreadifications<TM, CM> {
  const threadsDB = baseThreadsDB.clone();
  let notificationsById = Object.fromEntries(notificationsLUT);

  for (const optimisticUpdate of optimisticUpdates) {
    switch (optimisticUpdate.type) {
      case "create-thread": {
        threadsDB.upsert(optimisticUpdate.thread);
        break;
      }

      case "edit-thread-metadata": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        // If the thread has been updated since the optimistic update, we do not apply the update
        if (thread.updatedAt > optimisticUpdate.updatedAt) {
          break;
        }

        threadsDB.upsert({
          ...thread,
          updatedAt: optimisticUpdate.updatedAt,
          metadata: {
            ...thread.metadata,
            ...optimisticUpdate.metadata,
          },
        });
        break;
      }

      case "mark-thread-as-resolved": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        threadsDB.upsert({ ...thread, resolved: true });
        break;
      }

      case "mark-thread-as-unresolved": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        threadsDB.upsert({ ...thread, resolved: false });
        break;
      }

      case "create-comment": {
        const thread = threadsDB.get(optimisticUpdate.comment.threadId);
        if (thread === undefined) break;

        threadsDB.upsert(applyUpsertComment(thread, optimisticUpdate.comment));

        const inboxNotification = Object.values(notificationsById).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === thread.id
        );

        if (inboxNotification === undefined) {
          break;
        }

        notificationsById[inboxNotification.id] = {
          ...inboxNotification,
          notifiedAt: optimisticUpdate.comment.createdAt,
          readAt: optimisticUpdate.comment.createdAt,
        };

        break;
      }

      case "edit-comment": {
        const thread = threadsDB.get(optimisticUpdate.comment.threadId);
        if (thread === undefined) break;

        threadsDB.upsert(applyUpsertComment(thread, optimisticUpdate.comment));
        break;
      }

      case "delete-comment": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        threadsDB.upsert(
          applyDeleteComment(
            thread,
            optimisticUpdate.commentId,
            optimisticUpdate.deletedAt
          )
        );
        break;
      }

      case "delete-thread": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        threadsDB.upsert({
          ...thread,
          deletedAt: optimisticUpdate.deletedAt,
          updatedAt: optimisticUpdate.deletedAt,
          comments: [],
        });
        break;
      }

      case "add-reaction": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        threadsDB.upsert(
          applyAddReaction(
            thread,
            optimisticUpdate.commentId,
            optimisticUpdate.reaction
          )
        );
        break;
      }

      case "remove-reaction": {
        const thread = threadsDB.get(optimisticUpdate.threadId);
        if (thread === undefined) break;

        threadsDB.upsert(
          applyRemoveReaction(
            thread,
            optimisticUpdate.commentId,
            optimisticUpdate.emoji,
            optimisticUpdate.userId,
            optimisticUpdate.removedAt
          )
        );
        break;
      }

      case "mark-inbox-notification-as-read": {
        const ibn = notificationsById[optimisticUpdate.inboxNotificationId];

        // If the inbox notification doesn't exist, we do not apply the update
        if (ibn === undefined) {
          break;
        }

        notificationsById[optimisticUpdate.inboxNotificationId] = {
          ...ibn,
          readAt: optimisticUpdate.readAt,
        };
        break;
      }
      case "mark-all-inbox-notifications-as-read": {
        for (const id in notificationsById) {
          const ibn = notificationsById[id];

          // If the inbox notification doesn't exist, we do not apply the update
          if (ibn === undefined) {
            break;
          }

          notificationsById[id] = {
            ...ibn,
            readAt: optimisticUpdate.readAt,
          };
        }
        break;
      }
      case "delete-inbox-notification": {
        delete notificationsById[optimisticUpdate.inboxNotificationId];
        break;
      }
      case "delete-all-inbox-notifications": {
        notificationsById = {};
        break;
      }
    }
  }

  // TODO Maybe consider also removing these from the inboxNotificationsById registry?
  const sortedNotifications =
    // Sort so that the most recent notifications are first
    Object.values(notificationsById)
      .filter((ibn) =>
        ibn.kind === "thread" ? threadsDB.get(ibn.threadId) !== undefined : true
      )
      .sort((a, b) => b.notifiedAt.getTime() - a.notifiedAt.getTime());

  return {
    sortedNotifications,
    notificationsById,
    threadsDB,
  };
}

/**
 * Applies optimistic updates to room subscription settings in a stable way.
 */
function applyOptimisticUpdates_forRoomSubscriptionSettings(
  settingsLUT: RoomSubscriptionSettingsLUT,
  optimisticUpdates: readonly OptimisticUpdate<BaseMetadata, BaseMetadata>[]
): RoomSubscriptionSettingsByRoomId {
  const roomSubscriptionSettingsByRoomId = Object.fromEntries(settingsLUT);

  for (const optimisticUpdate of optimisticUpdates) {
    switch (optimisticUpdate.type) {
      case "update-room-subscription-settings": {
        const settings =
          roomSubscriptionSettingsByRoomId[optimisticUpdate.roomId];

        // If the settings don't exist, we do not apply the update
        if (settings === undefined) {
          break;
        }

        roomSubscriptionSettingsByRoomId[optimisticUpdate.roomId] = {
          ...settings,
          ...optimisticUpdate.settings,
        };
      }
    }
  }
  return roomSubscriptionSettingsByRoomId;
}

/**
 * Applies optimistic updates to subscriptions in a stable way.
 */
function applyOptimisticUpdates_forSubscriptions(
  subscriptionsLUT: SubscriptionsLUT,
  threads: ReadonlyThreadDB<BaseMetadata, BaseMetadata>,
  optimisticUpdates: readonly OptimisticUpdate<BaseMetadata, BaseMetadata>[]
): SubscriptionsByKey {
  const subscriptions = Object.fromEntries(subscriptionsLUT);

  for (const update of optimisticUpdates) {
    switch (update.type) {
      case "update-room-subscription-settings": {
        // Other room subscription settings don't affect optimistic updates at the moment
        if (!update.settings.threads) {
          continue;
        }

        const roomThreads = threads.findMany(
          update.roomId,
          undefined,
          "desc",
          undefined
        );

        for (const thread of roomThreads) {
          const subscriptionKey = getSubscriptionKey("thread", thread.id);

          switch (update.settings.threads) {
            // Create subscriptions for all existing threads in the room
            case "all": {
              subscriptions[subscriptionKey] = {
                kind: "thread",
                subjectId: thread.id,
                createdAt: new Date(),
              };
              break;
            }

            // Delete subscriptions for all existing threads in the room
            case "none": {
              delete subscriptions[subscriptionKey];
              break;
            }

            case "replies_and_mentions": {
              // TODO: We can't go through the comments and create subscriptions optimistically because
              //       we might not have group members for all group IDs which means we can't reliably
              //       know if the user was mentioned with a group mention.
              break;
            }

            default:
              assertNever(
                update.settings.threads,
                "Unexpected thread subscription settings."
              );
          }
        }
      }

      // TODO: We can't do the following pseudo-code yet because we don't have the room subscription settings
      // in the umbrella store when `useRoomSubscriptionSettings` isn't used.
      //
      // case "create-thread":
      // case "create-comment":
      //  // Create a subscription (if it doesn't exist yet) for the thread optimistically, unless the `"thread"`
      //  // room subscription settings for the user and the thread's room are set to `"none"`.
    }
  }

  return subscriptions;
}

/**
 * Applies optimistic update to notification settings in a stable way.
 * It's a deep update, and remove potential `undefined` properties from the final
 * output object because we update with a deep partial of `NotificationSettings`.
 *
 * Exported for unit tests only.
 */
export function applyOptimisticUpdates_forNotificationSettings(
  settings: NotificationSettings,
  optimisticUpdates: readonly OptimisticUpdate<BaseMetadata, BaseMetadata>[]
): NotificationSettings {
  let outcoming: NotificationSettings = settings;

  for (const update of optimisticUpdates) {
    if (update.type === "update-notification-settings") {
      outcoming = patchNotificationSettings(outcoming, update.settings);
    }
  }

  return outcoming;
}

/**
 * Compares two inbox notifications to determine which one is newer.
 * @param inboxNotificationA The first inbox notification to compare.
 * @param inboxNotificationB The second inbox notification to compare.
 * @returns 1 if inboxNotificationA is newer, -1 if inboxNotificationB is newer, or 0 if they are the same age or can't be compared.
 */
export function compareInboxNotifications(
  inboxNotificationA: InboxNotificationData,
  inboxNotificationB: InboxNotificationData
): number {
  if (inboxNotificationA.notifiedAt > inboxNotificationB.notifiedAt) {
    return 1;
  } else if (inboxNotificationA.notifiedAt < inboxNotificationB.notifiedAt) {
    return -1;
  }

  // notifiedAt times are the same, compare readAt times if both are not null
  if (inboxNotificationA.readAt && inboxNotificationB.readAt) {
    return inboxNotificationA.readAt > inboxNotificationB.readAt
      ? 1
      : inboxNotificationA.readAt < inboxNotificationB.readAt
        ? -1
        : 0;
  } else if (inboxNotificationA.readAt || inboxNotificationB.readAt) {
    return inboxNotificationA.readAt ? 1 : -1;
  }

  // If all dates are equal, return 0
  return 0;
}

/** @internal Exported for unit tests only. */
export function applyUpsertComment<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  thread: ThreadDataWithDeleteInfo<TM, CM>,
  comment: CommentData<CM>
): ThreadDataWithDeleteInfo<TM, CM> {
  // If the thread has been deleted, we do not apply the update
  if (thread.deletedAt !== undefined) {
    // Note: only the unit tests are passing in deleted threads here. In all
    // production code, this is never invoked for deleted threads.
    return thread;
  }

  // Validate that the comment belongs to the thread
  if (comment.threadId !== thread.id) {
    console.warn(
      `Comment ${comment.id} does not belong to thread ${thread.id}`
    );
    return thread;
  }

  const existingComment = thread.comments.find(
    (existingComment) => existingComment.id === comment.id
  );

  // If the comment doesn't exist in the thread, add the comment
  if (existingComment === undefined) {
    const updatedAt = new Date(
      Math.max(thread.updatedAt.getTime(), comment.createdAt.getTime())
    );

    const updatedThread = {
      ...thread,
      updatedAt,
      comments: [...thread.comments, comment],
    };

    return updatedThread;
  }

  // If the comment exists in the thread and has been deleted, do not apply the update
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  // Proceed to update the comment if:
  // 1. The existing comment has not been edited
  // 2. The incoming comment has not been edited (i.e. it's a new comment)
  // 3. The incoming comment has been edited more recently than the existing comment
  if (
    existingComment.editedAt === undefined ||
    comment.editedAt === undefined ||
    existingComment.editedAt <= comment.editedAt
  ) {
    const updatedComments = thread.comments.map((existingComment) =>
      existingComment.id === comment.id ? comment : existingComment
    );

    const updatedThread = {
      ...thread,
      updatedAt: new Date(
        Math.max(
          thread.updatedAt.getTime(),
          comment.editedAt?.getTime() || comment.createdAt.getTime()
        )
      ),
      comments: updatedComments,
    };
    return updatedThread;
  }

  return thread;
}

/** @internal Exported for unit tests only. */
export function applyDeleteComment<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  thread: ThreadDataWithDeleteInfo<TM, CM>,
  commentId: string,
  deletedAt: Date
): ThreadDataWithDeleteInfo<TM, CM> {
  // If the thread has been deleted, we do not delete the comment
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (comment) => comment.id === commentId
  );

  // If the comment doesn't exist in the thread, we cannot perform the deletion
  if (existingComment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the deletion request, we do not delete the comment
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  const updatedComments = thread.comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          deletedAt,
          // We optimistically remove the comment body and attachments when marking it as deleted
          body: undefined,
          attachments: [],
        }
      : comment
  );

  // If all comments have been deleted (or there are no comments in the first
  // place), we mark the thread as deleted.
  if (updatedComments.every((comment) => comment.deletedAt !== undefined)) {
    return {
      ...thread,
      deletedAt,
      updatedAt: deletedAt,
    };
  }

  return {
    ...thread,
    updatedAt: deletedAt,
    comments: updatedComments,
  };
}

/** @internal Exported for unit tests only. */
export function applyAddReaction<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  thread: ThreadDataWithDeleteInfo<TM, CM>,
  commentId: string,
  reaction: CommentUserReaction
): ThreadDataWithDeleteInfo<TM, CM> {
  // If the thread has been deleted, we do not add the reaction
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (comment) => comment.id === commentId
  );

  // If the comment doesn't exist in the thread, we do not add the reaction
  if (existingComment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the reaction addition request, we do not add the reaction
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  const updatedComments = thread.comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          reactions: upsertReaction(comment.reactions, reaction),
        }
      : comment
  );

  return {
    ...thread,
    updatedAt: new Date(
      Math.max(reaction.createdAt.getTime(), thread.updatedAt.getTime())
    ),
    comments: updatedComments,
  };
}

/** @internal Exported for unit tests only. */
export function applyRemoveReaction<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  thread: ThreadDataWithDeleteInfo<TM, CM>,
  commentId: string,
  emoji: string,
  userId: string,
  removedAt: Date
): ThreadDataWithDeleteInfo<TM, CM> {
  // If the thread has been deleted, we do not remove the reaction
  if (thread.deletedAt !== undefined) {
    return thread;
  }

  const existingComment = thread.comments.find(
    (comment) => comment.id === commentId
  );

  // If the comment doesn't exist in the thread, we do not remove the reaction
  if (existingComment === undefined) {
    return thread;
  }

  // If the comment has been deleted since the reaction removal request, we do not remove the reaction
  if (existingComment.deletedAt !== undefined) {
    return thread;
  }

  const updatedComments = thread.comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          reactions: comment.reactions
            .map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    users: reaction.users.filter((user) => user.id !== userId),
                  }
                : reaction
            )
            .filter((reaction) => reaction.users.length > 0), // Remove reactions with no users left
        }
      : comment
  );

  return {
    ...thread,
    updatedAt: new Date(
      Math.max(removedAt.getTime(), thread.updatedAt.getTime())
    ),
    comments: updatedComments,
  };
}

function upsertReaction(
  reactions: CommentReaction[],
  reaction: CommentUserReaction
): CommentReaction[] {
  const existingReaction = reactions.find(
    (existingReaction) => existingReaction.emoji === reaction.emoji
  );

  // If the reaction doesn't exist in the comment, we add it
  if (existingReaction === undefined) {
    return [
      ...reactions,
      {
        emoji: reaction.emoji,
        createdAt: reaction.createdAt,
        users: [{ id: reaction.userId }],
      },
    ];
  }

  // If the reaction exists in the comment, we add the user to the reaction if they are not already in it
  if (
    existingReaction.users.some((user) => user.id === reaction.userId) === false
  ) {
    return reactions.map((existingReaction) =>
      existingReaction.emoji === reaction.emoji
        ? {
            ...existingReaction,
            users: [...existingReaction.users, { id: reaction.userId }],
          }
        : existingReaction
    );
  }

  return reactions;
}
