import type {
  AsyncResult,
  BaseMetadata,
  BaseUserMeta,
  Client,
  CommentData,
  CommentReaction,
  CommentUserReaction,
  DistributiveOmit,
  EventSource,
  HistoryVersion,
  InboxNotificationData,
  InboxNotificationDeleteInfo,
  Observable,
  OpaqueClient,
  Patchable,
  Permission,
  Resolve,
  RoomNotificationSettings,
  SyncSource,
  ThreadData,
  ThreadDataWithDeleteInfo,
  ThreadDeleteInfo,
} from "@liveblocks/core";
import {
  autoRetry,
  batch,
  compactObject,
  console,
  DerivedSignal,
  HttpError,
  kInternal,
  makeEventSource,
  mapValues,
  nanoid,
  nn,
  Signal,
  stringify,
} from "@liveblocks/core";

import { autobind } from "./lib/autobind";
import type { ReadonlyThreadDB } from "./ThreadDB";
import { ThreadDB } from "./ThreadDB";
import type {
  InboxNotificationsAsyncResult,
  RoomNotificationSettingsAsyncResult,
  ThreadsAsyncResult,
  ThreadsQuery,
} from "./types";

type OptimisticUpdate<M extends BaseMetadata> =
  | CreateThreadOptimisticUpdate<M>
  | DeleteThreadOptimisticUpdate
  | EditThreadMetadataOptimisticUpdate<M>
  | MarkThreadAsResolvedOptimisticUpdate
  | MarkThreadAsUnresolvedOptimisticUpdate
  | CreateCommentOptimisticUpdate
  | EditCommentOptimisticUpdate
  | DeleteCommentOptimisticUpdate
  | AddReactionOptimisticUpdate
  | RemoveReactionOptimisticUpdate
  | MarkInboxNotificationAsReadOptimisticUpdate
  | MarkAllInboxNotificationsAsReadOptimisticUpdate
  | DeleteInboxNotificationOptimisticUpdate
  | DeleteAllInboxNotificationsOptimisticUpdate
  | UpdateNotificationSettingsOptimisticUpdate;

type CreateThreadOptimisticUpdate<M extends BaseMetadata> = {
  type: "create-thread";
  id: string;
  roomId: string;
  thread: ThreadData<M>;
};

type DeleteThreadOptimisticUpdate = {
  type: "delete-thread";
  id: string;
  roomId: string;
  threadId: string;
  deletedAt: Date;
};

type EditThreadMetadataOptimisticUpdate<M extends BaseMetadata> = {
  type: "edit-thread-metadata";
  id: string;
  threadId: string;
  metadata: Resolve<Patchable<M>>;
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

type CreateCommentOptimisticUpdate = {
  type: "create-comment";
  id: string;
  comment: CommentData;
};

type EditCommentOptimisticUpdate = {
  type: "edit-comment";
  id: string;
  comment: CommentData;
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

type UpdateNotificationSettingsOptimisticUpdate = {
  type: "update-notification-settings";
  id: string;
  roomId: string;
  settings: Partial<RoomNotificationSettings>;
};

type PaginationState = {
  cursor: string | null; // If `null`, it's the last page
  isFetchingMore: boolean;
  fetchMoreError?: Error;
};

/**
 * Valid combinations of field patches to the pagination state.
 */
type PaginationStatePatch =
  | { isFetchingMore: true }
  | {
      isFetchingMore: false;
      cursor: string | null;
      fetchMoreError: undefined;
    }
  | { isFetchingMore: false; fetchMoreError: Error };

/**
 * Example:
 * generateQueryKey('room-abc', { xyz: 123, abc: "red" })
 * → 'room-abc-{"color":"red","xyz":123}'
 */
function makeRoomThreadsQueryKey(
  roomId: string,
  query: ThreadsQuery<BaseMetadata> | undefined
) {
  return `${roomId}-${stringify(query ?? {})}`;
}

function makeUserThreadsQueryKey(
  query: ThreadsQuery<BaseMetadata> | undefined
) {
  return `USER_THREADS:${stringify(query ?? {})}`;
}

function makeNotificationSettingsQueryKey(roomId: string) {
  return `${roomId}:NOTIFICATION_SETTINGS`;
}

function makeVersionsQueryKey(roomId: string) {
  return `${roomId}-VERSIONS`;
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

const ASYNC_LOADING = Object.freeze({ isLoading: true });

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
  public readonly observable: Observable<void>;
  #eventSource: EventSource<void>;
  #fetchPage: (cursor?: string) => Promise<string | null>;
  #paginationState: PaginationState | null; // Should be null while in loading or error state!
  #pendingFetchMore: Promise<void> | null;

  constructor(fetchPage: (cursor?: string) => Promise<string | null>) {
    this.#paginationState = null;
    this.#fetchPage = fetchPage;
    this.#eventSource = makeEventSource<void>();
    this.#pendingFetchMore = null;
    this.observable = this.#eventSource.observable;

    autobind(this);
  }

  #patchPaginationState(patch: PaginationStatePatch): void {
    const state = this.#paginationState;
    if (state === null) return;
    this.#paginationState = { ...state, ...patch };
    this.#eventSource.notify();
  }

  async #fetchMore(): Promise<void> {
    const state = this.#paginationState;
    if (!state?.cursor) {
      // Do nothing if we don't have a cursor to work with. It means:
      // - We don't have a cursor yet (we haven't loaded the first page yet); or
      // - We don't have a cursor any longer (we're already on the
      // last page)
      return;
    }

    this.#patchPaginationState({ isFetchingMore: true });
    try {
      const nextCursor = await this.#fetchPage(state.cursor);
      this.#patchPaginationState({
        cursor: nextCursor,
        fetchMoreError: undefined,
        isFetchingMore: false,
      });
    } catch (err) {
      this.#patchPaginationState({
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
    const state = this.#paginationState;
    if (state?.cursor === null) {
      return noop;
    }

    // Case (3)
    if (!this.#pendingFetchMore) {
      this.#pendingFetchMore = this.#fetchMore().finally(() => {
        this.#pendingFetchMore = null;
      });
    }
    return this.#pendingFetchMore;
  }

  public get(): AsyncResult<{
    fetchMore: () => void;
    fetchMoreError?: Error;
    hasFetchedAll: boolean;
    isFetchingMore: boolean;
  }> {
    const usable = this.#cachedPromise;
    if (usable === null || usable.status === "pending") {
      return ASYNC_LOADING;
    }

    if (usable.status === "rejected") {
      return { isLoading: false, error: usable.reason };
    }

    const state = this.#paginationState!;
    return {
      isLoading: false,
      data: {
        fetchMore: this.fetchMore as () => void,
        isFetchingMore: state.isFetchingMore,
        fetchMoreError: state.fetchMoreError,
        hasFetchedAll: state.cursor === null,
      },
    };
  }

  #cachedPromise: UsablePromise<void> | null = null;

  public waitUntilLoaded(): UsablePromise<void> {
    if (this.#cachedPromise) {
      return this.#cachedPromise;
    }

    // Wrap the request to load room threads (and notifications) in an auto-retry function so that if the request fails,
    // we retry for at most 5 times with incremental backoff delays. If all retries fail, the auto-retry function throws an error
    const initialFetcher = autoRetry(
      () => this.#fetchPage(/* cursor */ undefined),
      5,
      [5000, 5000, 10000, 15000]
    );

    const promise = usify(
      initialFetcher.then((cursor) => {
        // Initial fetch completed
        this.#paginationState = {
          cursor,
          isFetchingMore: false,
          fetchMoreError: undefined,
        };
      })
    );

    // TODO for later: Maybe move this into the .then() above too?
    promise.then(
      () => this.#eventSource.notify(),
      () => {
        this.#eventSource.notify();

        // Wait for 5 seconds before removing the request from the cache
        setTimeout(() => {
          this.#cachedPromise = null;
          this.#eventSource.notify();
        }, 5_000);
      }
    );

    this.#cachedPromise = promise;
    return promise;
  }
}

export class SinglePageResource {
  public readonly observable: Observable<void>;
  #eventSource: EventSource<void>;
  #fetchPage: () => Promise<void>;

  constructor(fetchPage: () => Promise<void>) {
    this.#fetchPage = fetchPage;
    this.#eventSource = makeEventSource<void>();
    this.observable = this.#eventSource.observable;

    autobind(this);
  }

  public get(): AsyncResult<undefined> {
    const usable = this.#cachedPromise;
    if (usable === null || usable.status === "pending") {
      return ASYNC_LOADING;
    }

    if (usable.status === "rejected") {
      return { isLoading: false, error: usable.reason };
    }

    return {
      isLoading: false,
      data: undefined,
    };
  }

  #cachedPromise: UsablePromise<void> | null = null;

  public waitUntilLoaded(): UsablePromise<void> {
    if (this.#cachedPromise) {
      return this.#cachedPromise;
    }

    // Wrap the request to load room threads (and notifications) in an auto-retry function so that if the request fails,
    // we retry for at most 5 times with incremental backoff delays. If all retries fail, the auto-retry function throws an error
    const initialFetcher = autoRetry(
      () => this.#fetchPage(),
      5,
      [5000, 5000, 10000, 15000]
    );

    const promise = usify(initialFetcher);

    // TODO for later: Maybe move this into the .then() above too?
    promise.then(
      () => this.#eventSource.notify(),
      () => {
        this.#eventSource.notify();

        // Wait for 5 seconds before removing the request from the cache
        setTimeout(() => {
          this.#cachedPromise = null;
          this.#eventSource.notify();
        }, 5_000);
      }
    );

    this.#cachedPromise = promise;
    return promise;
  }
}

type VersionsByRoomId = Record<string, Record<string, HistoryVersion>>;

type NotificationsById = Record<string, InboxNotificationData>;

type SettingsByRoomId = Record<string, RoomNotificationSettings>;

type PermissionHintsByRoomId = Record<string, Set<Permission>>;

/**
 * Externally observable state of the store, which will have:
 * - Optimistic updates applied
 * - All deleted threads removed from the threads list
 */
export type UmbrellaStoreState<M extends BaseMetadata> = {
  /**
   * Keep track of loading and error status of all the queries made by the client.
   * e.g. 'room-abc-{"color":"red"}'  - ok
   * e.g. 'room-abc-{}'               - loading
   */

  // TODO: This should not get exposed via the "full state". Instead, we should
  // expose it via a cached `.getThreadDB()`, and invalidate this cached
  // value if either the threads change or a (thread) optimistic update is
  // changed.
  threadsDB: ReadonlyThreadDB<M>;

  /**
   * All inbox notifications in a sorted array, optimistic updates applied.
   */
  cleanedNotifications: InboxNotificationData[];

  /**
   * Inbox notifications by ID.
   * e.g. `in_${string}`
   */
  notificationsById: Record<string, InboxNotificationData>;

  /**
   * Notification settings by room ID.
   * e.g. { 'room-abc': { threads: "all" },
   *        'room-def': { threads: "replies_and_mentions" },
   *        'room-xyz': { threads: "none" },
   *      }
   */
  settingsByRoomId: Record<string, RoomNotificationSettings>;

  /**
   * Versions by roomId
   * e.g. { 'room-abc': {versions: "all versions"}}
   */
  versionsByRoomId: Record<string, Record<string, HistoryVersion>>;
};

export class UmbrellaStore<M extends BaseMetadata> {
  #client: Client<BaseUserMeta, M>;
  #syncSource: SyncSource;

  // Raw threads DB (without any optimistic updates applied)
  readonly threadsDB: ThreadDB<M>;

  //
  // Internally, the UmbrellaStore keeps track of a few source signals that can
  // be set and mutated individually. When any of those are mutated then the
  // clean "external state" is recomputed.
  //
  // Inputs (can be mutated):
  // - Thread DB
  // - Permissions by room
  // - Notifications by ID
  // - Settings by room ID
  // - Versions by room ID
  // - Optimistic updates
  //
  // Outputs (computed):
  // - External state with optimistic updates applied (= UmbrellaStoreState type)
  //

  readonly optimisticUpdates: Signal<readonly OptimisticUpdate<M>[]>;
  readonly historyVersionsByRoomId: Signal<VersionsByRoomId>;
  readonly notificationsById: Signal<NotificationsById>;
  readonly settingsByRoomId: Signal<SettingsByRoomId>;
  readonly permissionHintsByRoomId: Signal<PermissionHintsByRoomId>;
  externalState: DerivedSignal<UmbrellaStoreState<M>>;

  // Notifications
  #notificationsLastRequestedAt: Date | null = null; // Keeps track of when we successfully requested an inbox notifications update for the last time. Will be `null` as long as the first successful fetch hasn't happened yet.
  #notifications: PaginatedResource;

  // Room Threads
  #roomThreadsLastRequestedAtByRoom = new Map<string, Date>();
  #roomThreads: Map<string, PaginatedResource> = new Map();

  // User Threads
  #userThreadsLastRequestedAt: Date | null = null;
  #userThreads: Map<string, PaginatedResource> = new Map();

  // Room versions
  #roomVersions: Map<string, SinglePageResource> = new Map();
  #roomVersionsLastRequestedAtByRoom = new Map<string, Date>();

  // Room notification settings
  #roomNotificationSettings: Map<string, SinglePageResource> = new Map();

  constructor(client: OpaqueClient) {
    this.#client = client[kInternal].as<M>();
    this.#syncSource = this.#client[kInternal].createSyncSource();

    const inboxFetcher = async (cursor?: string) => {
      const result = await this.#client.getInboxNotifications({ cursor });

      this.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications
      );

      // We initialize the `_lastRequestedNotificationsAt` date using the server timestamp after we've loaded the first page of inbox notifications.
      if (this.#notificationsLastRequestedAt === null) {
        this.#notificationsLastRequestedAt = result.requestedAt;
      }

      const nextCursor = result.nextCursor;
      return nextCursor;
    };

    // XXX Looks like this should also be a Signal!
    this.#notifications = new PaginatedResource(inboxFetcher);
    this.#notifications.observable.subscribe(() =>
      // Note that the store itself does not change, but it's only vehicle at
      // the moment to trigger a re-render, so we'll do a no-op update here.
      this.historyVersionsByRoomId.set((store) => ({ ...store }))
    );

    this.threadsDB = new ThreadDB();
    this.optimisticUpdates = new Signal<readonly OptimisticUpdate<M>[]>([]);
    this.historyVersionsByRoomId = new Signal<VersionsByRoomId>({});
    this.notificationsById = new Signal<NotificationsById>({});
    this.settingsByRoomId = new Signal<SettingsByRoomId>({});
    this.permissionHintsByRoomId = new Signal<PermissionHintsByRoomId>({});

    this.externalState = DerivedSignal.from(
      this.optimisticUpdates,
      this.historyVersionsByRoomId,
      this.notificationsById,
      this.settingsByRoomId,
      this.threadsDB.signal,

      (ou, hv, no, st, thDB): UmbrellaStoreState<M> =>
        internalToExternalState(thDB, ou, hv, no, st)
    );

    // Auto-bind all of this class’ methods here, so we can use stable
    // references to them (most important for use in useSyncExternalStore)
    autobind(this);
  }

  private get(): UmbrellaStoreState<M> {
    return this.externalState.get();
  }

  public subscribe(callback: () => void): () => void {
    return this.externalState.subscribe(callback);
  }

  public getFullState(): UmbrellaStoreState<M> {
    return this.get();
  }

  /**
   * Returns the async result of the given query and room id. If the query is success,
   * then it will return the threads that match that provided query and room id.
   *
   */
  public getRoomThreadsLoadingState(
    roomId: string,
    query: ThreadsQuery<M> | undefined
  ): ThreadsAsyncResult<M> {
    const queryKey = makeRoomThreadsQueryKey(roomId, query);

    const paginatedResource = this.#roomThreads.get(queryKey);
    if (paginatedResource === undefined) {
      return ASYNC_LOADING;
    }

    const asyncResult = paginatedResource.get();
    if (asyncResult.isLoading || asyncResult.error) {
      return asyncResult;
    }

    const threads = this.getFullState().threadsDB.findMany(
      roomId,
      query ?? {},
      "asc"
    );

    const page = asyncResult.data;
    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      threads,
      hasFetchedAll: page.hasFetchedAll,
      isFetchingMore: page.isFetchingMore,
      fetchMoreError: page.fetchMoreError,
      fetchMore: page.fetchMore,
    };
  }

  public getUserThreadsLoadingState(
    query: ThreadsQuery<M> | undefined
  ): ThreadsAsyncResult<M> {
    const queryKey = makeUserThreadsQueryKey(query);

    const paginatedResource = this.#userThreads.get(queryKey);
    if (paginatedResource === undefined) {
      return ASYNC_LOADING;
    }

    const asyncResult = paginatedResource.get();
    if (asyncResult.isLoading || asyncResult.error) {
      return asyncResult;
    }

    const threads = this.getFullState().threadsDB.findMany(
      undefined, // Do _not_ filter by roomId
      query ?? {},
      "desc"
    );

    const page = asyncResult.data;
    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      threads,
      hasFetchedAll: page.hasFetchedAll,
      isFetchingMore: page.isFetchingMore,
      fetchMoreError: page.fetchMoreError,
      fetchMore: page.fetchMore,
    };
  }

  // NOTE: This will read the async result, but WILL NOT start loading at the moment!
  public getInboxNotificationsLoadingState(): InboxNotificationsAsyncResult {
    const asyncResult = this.#notifications.get();
    if (asyncResult.isLoading || asyncResult.error) {
      return asyncResult;
    }

    const page = asyncResult.data;
    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      inboxNotifications: this.getFullState().cleanedNotifications,
      hasFetchedAll: page.hasFetchedAll,
      isFetchingMore: page.isFetchingMore,
      fetchMoreError: page.fetchMoreError,
      fetchMore: page.fetchMore,
    };
  }

  // NOTE: This will read the async result, but WILL NOT start loading at the moment!
  public getNotificationSettingsLoadingState(
    roomId: string
  ): RoomNotificationSettingsAsyncResult {
    const queryKey = makeNotificationSettingsQueryKey(roomId);

    const resource = this.#roomNotificationSettings.get(queryKey);
    if (resource === undefined) {
      return ASYNC_LOADING;
    }

    const asyncResult = resource.get();
    if (asyncResult.isLoading || asyncResult.error) {
      return asyncResult;
    }

    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      settings: nn(this.get().settingsByRoomId[roomId]),
    };
  }

  public getRoomVersionsLoadingState(
    roomId: string
  ): AsyncResult<HistoryVersion[], "versions"> {
    const queryKey = makeVersionsQueryKey(roomId);

    const resource = this.#roomVersions.get(queryKey);
    if (resource === undefined) {
      return ASYNC_LOADING;
    }

    const asyncResult = resource.get();
    if (asyncResult.isLoading || asyncResult.error) {
      return asyncResult;
    }

    // TODO Memoize this value to ensure stable result, so we won't have to use the selector and isEqual functions!
    return {
      isLoading: false,
      versions: Object.values(this.historyVersionsByRoomId.get()[roomId] ?? {}),
    };
  }

  // Direct low-level cache mutations ------------------------------------------------- {{{

  #mutateThreadsDB(mutate: (db: ThreadDB<M>) => void): void {
    batch(() => {
      mutate(this.threadsDB);
    });
  }

  #updateInboxNotificationsCache(
    mapFn: (
      cache: Readonly<Record<string, InboxNotificationData>>
    ) => Readonly<Record<string, InboxNotificationData>>
  ): void {
    this.notificationsById.set((prev) => mapFn(prev));
  }

  #setNotificationSettings(
    roomId: string,
    settings: RoomNotificationSettings
  ): void {
    this.settingsByRoomId.set((state) => ({
      ...state,
      [roomId]: settings,
    }));
  }

  #updateRoomVersions(roomId: string, versions: HistoryVersion[]): void {
    this.historyVersionsByRoomId.set((prev) => {
      const newVersions: Record<string, HistoryVersion> = { ...prev[roomId] };
      for (const version of versions) {
        newVersions[version.id] = version;
      }
      return {
        ...prev,
        [roomId]: newVersions,
      };
    });
  }

  #updateOptimisticUpdatesCache(
    mapFn: (
      cache: readonly OptimisticUpdate<M>[]
    ) => readonly OptimisticUpdate<M>[]
  ): void {
    this.optimisticUpdates.set((curr) => {
      const optimisticUpdates = mapFn(curr);
      // XXX Make this a subscriber instead of mutating here directly
      this.#syncSource.setSyncStatus(
        optimisticUpdates.length > 0 ? "synchronizing" : "synchronized"
      );
      return optimisticUpdates;
    });
  }

  // ---------------------------------------------------------------------------------- }}}

  /** @internal - Only call this method from unit tests. */
  // XXX Rename this!
  public force_set2(
    callback: (currentState: VersionsByRoomId) => VersionsByRoomId
  ): void {
    return this.historyVersionsByRoomId.set(callback);
  }

  /** @internal - Only call this method from unit tests. */
  public force_set_notifications(
    callback: (currentState: NotificationsById) => NotificationsById
  ): void {
    return this.notificationsById.set(callback);
  }

  /**
   * Updates an existing inbox notification with a new value, replacing the
   * corresponding optimistic update.
   *
   * This will not update anything if the inbox notification ID isn't found in
   * the cache.
   */
  public updateInboxNotification(
    inboxNotificationId: string,
    optimisticUpdateId: string,
    callback: (
      notification: Readonly<InboxNotificationData>
    ) => Readonly<InboxNotificationData>
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣

      // 2️⃣
      this.#updateInboxNotificationsCache((cache) => {
        const existing = cache[inboxNotificationId];
        if (!existing) {
          // If the inbox notification doesn't exist in the cache, we do not
          // change anything
          return cache;
        }

        return {
          ...cache,
          [inboxNotificationId]: callback(existing),
        };
      });
    });
  }

  /**
   * Updates *all* inbox notifications by running a mapper function over all of
   * them, replacing the corresponding optimistic update.
   */
  public updateAllInboxNotifications(
    optimisticUpdateId: string,
    mapFn: (
      notification: Readonly<InboxNotificationData>
    ) => Readonly<InboxNotificationData>
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      this.#updateInboxNotificationsCache((cache) => mapValues(cache, mapFn)); // 2️⃣
    });
  }

  /**
   * Deletes an existing inbox notification, replacing the corresponding
   * optimistic update.
   */
  public deleteInboxNotification(
    inboxNotificationId: string,
    optimisticUpdateId: string
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣

      // 2️⃣
      this.#updateInboxNotificationsCache((cache) => {
        // Delete it
        const { [inboxNotificationId]: removed, ...newCache } = cache;
        return removed === undefined ? cache : newCache;
      });
    });
  }

  /**
   * Deletes *all* inbox notifications, replacing the corresponding optimistic
   * update.
   */
  public deleteAllInboxNotifications(optimisticUpdateId: string): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      this.#updateInboxNotificationsCache(() => ({})); // 2️⃣ empty the cache
    });
  }

  /**
   * Creates an new thread, replacing the corresponding optimistic update.
   */
  public createThread(
    optimisticUpdateId: string,
    thread: Readonly<ThreadDataWithDeleteInfo<M>>
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣j
      this.#mutateThreadsDB((db) => db.upsert(thread)); // 2️⃣
    });
  }

  /**
   * Updates an existing thread with a new value, replacing the corresponding
   * optimistic update.
   *
   * This will not update anything if:
   * - The thread ID isn't found in the cache; or
   * - The thread ID was already deleted from the cache; or
   * - The thread ID in the cache was updated more recently than the optimistic
   *   update's timestamp (if given)
   */
  #updateThread(
    threadId: string,
    optimisticUpdateId: string | null,
    callback: (
      thread: Readonly<ThreadDataWithDeleteInfo<M>>
    ) => Readonly<ThreadDataWithDeleteInfo<M>>,
    updatedAt?: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      if (optimisticUpdateId !== null) {
        this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      }

      // 2️⃣
      this.#mutateThreadsDB((db) => {
        const existing = db.get(threadId);
        if (!existing) return;
        if (!!updatedAt && existing.updatedAt > updatedAt) return;

        db.upsert(callback(existing));
      });
    });
  }

  public patchThread(
    threadId: string,
    optimisticUpdateId: string | null,
    patch: {
      // Only these fields are currently supported to patch
      metadata?: M;
      resolved?: boolean;
    },
    updatedAt: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    return this.#updateThread(
      threadId,
      optimisticUpdateId,
      (thread) => ({ ...thread, ...compactObject(patch) }),
      updatedAt
    );
  }

  public addReaction(
    threadId: string,
    optimisticUpdateId: string | null,
    commentId: string,
    reaction: CommentUserReaction,
    createdAt: Date // TODO We could look this up from the optimisticUpdate instead?
  ): void {
    this.#updateThread(
      threadId,
      optimisticUpdateId,
      (thread) => applyAddReaction(thread, commentId, reaction),
      createdAt
    );
  }

  public removeReaction(
    threadId: string,
    optimisticUpdateId: string | null,
    commentId: string,
    emoji: string,
    userId: string,
    removedAt: Date
  ): void {
    this.#updateThread(
      threadId,
      optimisticUpdateId,
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
   * - The thread ID isn't found in the cache; or
   * - The thread ID was already deleted from the cache
   */
  public deleteThread(
    threadId: string,
    optimisticUpdateId: string | null
  ): void {
    return this.#updateThread(
      threadId,
      optimisticUpdateId,

      // A deletion is actually an update of the deletedAt property internally
      (thread) => ({ ...thread, updatedAt: new Date(), deletedAt: new Date() })
    );
  }

  /**
   * Creates an existing comment and ensures the associated notification is
   * updated correctly, replacing the corresponding optimistic update.
   */
  public createComment(
    newComment: CommentData,
    optimisticUpdateId: string
  ): void {
    // Batch 1️⃣ + 2️⃣ + 3️⃣
    batch(() => {
      // 1️⃣
      this.removeOptimisticUpdate(optimisticUpdateId);

      // If the associated thread is not found, we cannot create a comment under it
      const existingThread = this.threadsDB.get(newComment.threadId);
      if (!existingThread) {
        return;
      }

      // 2️⃣ Update the thread instance by adding a comment under it
      this.#mutateThreadsDB((db) =>
        db.upsert(applyUpsertComment(existingThread, newComment))
      );

      // 3️⃣ Update the associated inbox notification (if any)
      this.#updateInboxNotificationsCache((cache) => {
        const existingNotification = Object.values(cache).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === newComment.threadId
        );

        if (!existingNotification) {
          // Nothing to update here
          return cache;
        }

        // If the thread has an inbox notification associated with it, we update the notification's `notifiedAt` and `readAt` values
        return {
          ...cache,
          [existingNotification.id]: {
            ...existingNotification,
            notifiedAt: newComment.createdAt,
            readAt: newComment.createdAt,
          },
        };
      });
    });
  }

  public editComment(
    threadId: string,
    optimisticUpdateId: string,
    editedComment: CommentData
  ): void {
    return this.#updateThread(threadId, optimisticUpdateId, (thread) =>
      applyUpsertComment(thread, editedComment)
    );
  }

  public deleteComment(
    threadId: string,
    optimisticUpdateId: string,
    commentId: string,
    deletedAt: Date
  ): void {
    return this.#updateThread(
      threadId,
      optimisticUpdateId,
      (thread) => applyDeleteComment(thread, commentId, deletedAt),
      deletedAt
    );
  }

  public updateThreadAndNotification(
    thread: ThreadData<M>,
    inboxNotification?: InboxNotificationData
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      // 1️⃣
      this.#mutateThreadsDB((db) => db.upsertIfNewer(thread));

      // 2️⃣
      if (inboxNotification !== undefined) {
        this.#updateInboxNotificationsCache((cache) => ({
          ...cache,
          [inboxNotification.id]: inboxNotification,
        }));
      }
    });
  }

  public updateThreadsAndNotifications(
    threads: ThreadData<M>[],
    inboxNotifications: InboxNotificationData[]
  ): void;
  public updateThreadsAndNotifications(
    threads: ThreadData<M>[],
    inboxNotifications: InboxNotificationData[],
    deletedThreads: ThreadDeleteInfo[],
    deletedInboxNotifications: InboxNotificationDeleteInfo[]
  ): void;
  public updateThreadsAndNotifications(
    threads: ThreadData<M>[],
    inboxNotifications: InboxNotificationData[],
    deletedThreads: ThreadDeleteInfo[] = [],
    deletedInboxNotifications: InboxNotificationDeleteInfo[] = []
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      // 1️⃣
      this.#mutateThreadsDB((db) =>
        applyThreadDeltaUpdates(db, { newThreads: threads, deletedThreads })
      );

      // 2️⃣
      this.#updateInboxNotificationsCache((cache) =>
        applyNotificationsUpdates(cache, {
          newInboxNotifications: inboxNotifications,
          deletedNotifications: deletedInboxNotifications,
        })
      );
    });
  }

  /**
   * Updates existing notification setting for a room with a new value,
   * replacing the corresponding optimistic update.
   */
  public updateRoomNotificationSettings_confirmOptimisticUpdate(
    roomId: string,
    optimisticUpdateId: string,
    settings: Readonly<RoomNotificationSettings>
  ): void {
    // Batch 1️⃣ + 2️⃣
    batch(() => {
      this.removeOptimisticUpdate(optimisticUpdateId); // 1️⃣
      this.#setNotificationSettings(roomId, settings); // 2️⃣
    });
  }

  public addOptimisticUpdate(
    optimisticUpdate: DistributiveOmit<OptimisticUpdate<M>, "id">
  ): string {
    const id = nanoid();
    const newUpdate: OptimisticUpdate<M> = { ...optimisticUpdate, id };
    this.#updateOptimisticUpdatesCache((cache) => [...cache, newUpdate]);
    return id;
  }

  public removeOptimisticUpdate(optimisticUpdateId: string): void {
    this.#updateOptimisticUpdatesCache((cache) =>
      cache.filter((ou) => ou.id !== optimisticUpdateId)
    );
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

    this.updateThreadsAndNotifications(
      result.threads.updated,
      result.inboxNotifications.updated,
      result.threads.deleted,
      result.inboxNotifications.deleted
    );
  }

  public waitUntilNotificationsLoaded(): UsablePromise<void> {
    return this.#notifications.waitUntilLoaded();
  }

  #updatePermissionHints(newHints: Record<string, Permission[]>) {
    this.permissionHintsByRoomId.set((prev) => {
      const permissionsByRoom = { ...prev };

      for (const [roomId, newPermissions] of Object.entries(newHints)) {
        // Get the existing set of permissions for the room and only ever add permission to this set
        const existing = permissionsByRoom[roomId] ?? new Set();
        // Add the new permissions to the set of existing permissions
        for (const permission of newPermissions) {
          existing.add(permission);
        }
        permissionsByRoom[roomId] = existing;
      }

      return permissionsByRoom;
    });
  }

  public waitUntilRoomThreadsLoaded(
    roomId: string,
    query: ThreadsQuery<M> | undefined
  ) {
    const threadsFetcher = async (cursor?: string) => {
      const result = await this.#client[kInternal].httpClient.getThreads({
        roomId,
        cursor,
        query,
      });
      this.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications
      );

      this.#updatePermissionHints(result.permissionHints);

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
        this.#roomThreadsLastRequestedAtByRoom.set(roomId, result.requestedAt);
      }

      return result.nextCursor;
    };

    const queryKey = makeRoomThreadsQueryKey(roomId, query);
    let paginatedResource = this.#roomThreads.get(queryKey);
    if (paginatedResource === undefined) {
      paginatedResource = new PaginatedResource(threadsFetcher);
    }

    // XXX Looks like this should also be a Signal!
    paginatedResource.observable.subscribe(() =>
      // Note that the store itself does not change, but it's only vehicle at
      // the moment to trigger a re-render, so we'll do a no-op update here.
      this.historyVersionsByRoomId.set((store) => ({ ...store }))
    );

    this.#roomThreads.set(queryKey, paginatedResource);

    return paginatedResource.waitUntilLoaded();
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

    this.updateThreadsAndNotifications(
      updates.threads.updated,
      updates.inboxNotifications.updated,
      updates.threads.deleted,
      updates.inboxNotifications.deleted
    );

    this.#updatePermissionHints(updates.permissionHints);

    if (lastRequestedAt < updates.requestedAt) {
      // Update the `lastRequestedAt` value for the room to the timestamp returned by the current request
      this.#roomThreadsLastRequestedAtByRoom.set(roomId, updates.requestedAt);
    }
  }

  public waitUntilUserThreadsLoaded(query: ThreadsQuery<M> | undefined) {
    const queryKey = makeUserThreadsQueryKey(query);

    const threadsFetcher = async (cursor?: string) => {
      const result = await this.#client[
        kInternal
      ].httpClient.getUserThreads_experimental({
        cursor,
        query,
      });
      this.updateThreadsAndNotifications(
        result.threads,
        result.inboxNotifications
      );

      this.#updatePermissionHints(result.permissionHints);

      // We initialize the `_userThreadsLastRequestedAt` date using the server timestamp after we've loaded the first page of inbox notifications.
      if (this.#userThreadsLastRequestedAt === null) {
        this.#userThreadsLastRequestedAt = result.requestedAt;
      }

      return result.nextCursor;
    };

    let paginatedResource = this.#userThreads.get(queryKey);
    if (paginatedResource === undefined) {
      paginatedResource = new PaginatedResource(threadsFetcher);
    }

    // XXX Looks like this should also be a Signal!
    paginatedResource.observable.subscribe(() =>
      // Note that the store itself does not change, but it's only vehicle at
      // the moment to trigger a re-render, so we'll do a no-op update here.
      this.historyVersionsByRoomId.set((store) => ({ ...store }))
    );

    this.#userThreads.set(queryKey, paginatedResource);

    return paginatedResource.waitUntilLoaded();
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

    this.updateThreadsAndNotifications(
      result.threads.updated,
      result.inboxNotifications.updated,
      result.threads.deleted,
      result.inboxNotifications.deleted
    );

    this.#updatePermissionHints(result.permissionHints);
  }

  public waitUntilRoomVersionsLoaded(roomId: string) {
    const queryKey = makeVersionsQueryKey(roomId);
    let resource = this.#roomVersions.get(queryKey);
    if (resource === undefined) {
      const versionsFetcher = async () => {
        const room = this.#client.getRoom(roomId);
        if (room === null) {
          throw new HttpError(
            `Room '${roomId}' is not available on client`,
            479
          );
        }

        const result = await room[kInternal].listTextVersions();
        this.#updateRoomVersions(roomId, result.versions);

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
      };

      resource = new SinglePageResource(versionsFetcher);
    }

    // XXX Looks like this should also be a Signal!
    resource.observable.subscribe(() =>
      // Note that the store itself does not change, but it's only vehicle at
      // the moment to trigger a re-render, so we'll do a no-op update here.
      this.historyVersionsByRoomId.set((store) => ({ ...store }))
    );

    this.#roomVersions.set(queryKey, resource);

    return resource.waitUntilLoaded();
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

    this.#updateRoomVersions(roomId, updates.versions);

    if (lastRequestedAt < updates.requestedAt) {
      // Update the `lastRequestedAt` value for the room to the timestamp returned by the current request
      this.#roomVersionsLastRequestedAtByRoom.set(roomId, updates.requestedAt);
    }
  }

  public waitUntilRoomNotificationSettingsLoaded(roomId: string) {
    const queryKey = makeNotificationSettingsQueryKey(roomId);
    let resource = this.#roomNotificationSettings.get(queryKey);
    if (resource === undefined) {
      const notificationSettingsFetcher = async () => {
        const room = this.#client.getRoom(roomId);
        if (room === null) {
          throw new HttpError(
            `Room '${roomId}' is not available on client`,
            479
          );
        }

        const result = await room.getNotificationSettings();
        this.#setNotificationSettings(roomId, result);
      };

      resource = new SinglePageResource(notificationSettingsFetcher);
    }

    // XXX Looks like this should also be a Signal!
    resource.observable.subscribe(() =>
      // Note that the store itself does not change, but it's only vehicle at
      // the moment to trigger a re-render, so we'll do a no-op update here.
      this.historyVersionsByRoomId.set((store) => ({ ...store }))
    );

    this.#roomNotificationSettings.set(queryKey, resource);

    return resource.waitUntilLoaded();
  }

  public async refreshRoomNotificationSettings(
    roomId: string,
    signal: AbortSignal
  ) {
    const room = nn(
      this.#client.getRoom(roomId),
      `Room with id ${roomId} is not available on client`
    );
    const result = await room.getNotificationSettings({ signal });
    this.#setNotificationSettings(roomId, result);
  }
}

/**
 * Applies optimistic updates, removes deleted threads, sorts results in
 * a stable way, removes internal fields that should not be exposed publicly.
 */
function internalToExternalState<M extends BaseMetadata>(
  rawThreadsDB: ThreadDB<M>,
  optimisticUpdates: readonly OptimisticUpdate<M>[],
  versionsByRoomId: VersionsByRoomId, // XXX This isn't even used and converted, it's just returned! Better to use this signal directly then, instead of exposing it through UmbrellaStoreState
  rawNotificationsById: NotificationsById,
  rawSettingsByRoomId: SettingsByRoomId
): UmbrellaStoreState<M> {
  const threadsDB = rawThreadsDB.clone();

  const computed = {
    notificationsById: { ...rawNotificationsById },
    settingsByRoomId: { ...rawSettingsByRoomId },
  };

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

        const inboxNotification = Object.values(
          computed.notificationsById
        ).find(
          (notification) =>
            notification.kind === "thread" &&
            notification.threadId === thread.id
        );

        if (inboxNotification === undefined) {
          break;
        }

        computed.notificationsById[inboxNotification.id] = {
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
        const ibn =
          computed.notificationsById[optimisticUpdate.inboxNotificationId];

        // If the inbox notification doesn't exist in the cache, we do not apply the update
        if (ibn === undefined) {
          break;
        }

        computed.notificationsById[optimisticUpdate.inboxNotificationId] = {
          ...ibn,
          readAt: optimisticUpdate.readAt,
        };
        break;
      }
      case "mark-all-inbox-notifications-as-read": {
        for (const id in computed.notificationsById) {
          const ibn = computed.notificationsById[id];

          // If the inbox notification doesn't exist in the cache, we do not apply the update
          if (ibn === undefined) {
            break;
          }

          computed.notificationsById[id] = {
            ...ibn,
            readAt: optimisticUpdate.readAt,
          };
        }
        break;
      }
      case "delete-inbox-notification": {
        delete computed.notificationsById[optimisticUpdate.inboxNotificationId];
        break;
      }
      case "delete-all-inbox-notifications": {
        computed.notificationsById = {};
        break;
      }

      case "update-notification-settings": {
        const settings = computed.settingsByRoomId[optimisticUpdate.roomId];

        // If the inbox notification doesn't exist in the cache, we do not apply the update
        if (settings === undefined) {
          break;
        }

        computed.settingsByRoomId[optimisticUpdate.roomId] = {
          ...settings,
          ...optimisticUpdate.settings,
        };
      }
    }
  }

  // TODO Maybe consider also removing these from the inboxNotificationsById registry?
  const cleanedNotifications =
    // Sort so that the most recent notifications are first
    Object.values(computed.notificationsById)
      .filter((ibn) =>
        ibn.kind === "thread" ? threadsDB.get(ibn.threadId) !== undefined : true
      )
      .sort((a, b) => b.notifiedAt.getTime() - a.notifiedAt.getTime());

  return {
    cleanedNotifications,
    notificationsById: computed.notificationsById,
    settingsByRoomId: computed.settingsByRoomId,
    threadsDB,
    versionsByRoomId,
  };
}

export function applyThreadDeltaUpdates<M extends BaseMetadata>(
  db: ThreadDB<M>,
  updates: {
    newThreads: ThreadData<M>[];
    deletedThreads: ThreadDeleteInfo[];
  }
): void {
  // Add new threads or update existing threads if the existing thread is older than the new thread.
  updates.newThreads.forEach((thread) => db.upsertIfNewer(thread));

  // Mark threads in the deletedThreads list as deleted
  updates.deletedThreads.forEach(({ id, deletedAt }) => {
    const existing = db.getEvenIfDeleted(id);
    if (!existing) return;

    db.delete(id, deletedAt);
  });
}

export function applyNotificationsUpdates(
  existingInboxNotifications: Record<string, InboxNotificationData>,
  updates: {
    newInboxNotifications: InboxNotificationData[];
    deletedNotifications: InboxNotificationDeleteInfo[];
  }
): Record<string, InboxNotificationData> {
  const updatedInboxNotifications = { ...existingInboxNotifications };

  // Add new notifications or update existing notifications if the existing notification is older than the new notification.
  updates.newInboxNotifications.forEach((notification) => {
    const existingNotification = updatedInboxNotifications[notification.id];
    // If the notification already exists, we need to compare the two notifications to determine which one is newer.
    if (existingNotification) {
      const result = compareInboxNotifications(
        existingNotification,
        notification
      );

      // If the existing notification is newer than the new notification, we do not update the existing notification.
      if (result === 1) return;
    }

    // If the new notification is newer than the existing notification, we update the existing notification.
    updatedInboxNotifications[notification.id] = notification;
  });

  updates.deletedNotifications.forEach(
    ({ id }) => delete updatedInboxNotifications[id]
  );

  return updatedInboxNotifications;
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
export function applyUpsertComment<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  comment: CommentData
): ThreadDataWithDeleteInfo<M> {
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
export function applyDeleteComment<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  commentId: string,
  deletedAt: Date
): ThreadDataWithDeleteInfo<M> {
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
export function applyAddReaction<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  commentId: string,
  reaction: CommentUserReaction
): ThreadDataWithDeleteInfo<M> {
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
export function applyRemoveReaction<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>,
  commentId: string,
  emoji: string,
  userId: string,
  removedAt: Date
): ThreadDataWithDeleteInfo<M> {
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
