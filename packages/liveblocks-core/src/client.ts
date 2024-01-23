import type { AuthValue } from "./auth-manager";
import { createAuthManager } from "./auth-manager";
import { isIdle } from "./connection";
import { DEFAULT_BASE_URL } from "./constants";
import {
  convertToInboxNotificationData,
  convertToThreadData,
} from "./convert-plain-data";
import type { LsonObject } from "./crdts/Lson";
import { linkDevTools, setupDevTools, unlinkDevTools } from "./devtools";
import { kInternal } from "./internal";
import type { BatchStore } from "./lib/batch";
import { Batch, createBatchStore } from "./lib/batch";
import { createStore, Store } from "./lib/create-store";
import { deprecateIf } from "./lib/deprecation";
import * as console from "./lib/fancy-console";
import type { Json, JsonObject } from "./lib/Json";
import type { Resolve } from "./lib/Resolve";
import type { CustomAuthenticationResult } from "./protocol/Authentication";
import { TokenKind } from "./protocol/AuthToken";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { Polyfills, Room, RoomDelegates, RoomInitializers } from "./room";
import {
  createRoom,
  makeAuthDelegateForRoom,
  makeCreateSocketDelegateForRoom,
} from "./room";
import type { CacheStore } from "./store";
import { createClientStore } from "./store";
import type { BaseMetadata } from "./types/BaseMetadata";
import type {
  InboxNotificationData,
  InboxNotificationDataPlain,
} from "./types/InboxNotificationData";
import type { OptionalPromise } from "./types/OptionalPromise";
import type { ThreadData, ThreadDataPlain } from "./types/ThreadData";

const MIN_THROTTLE = 16;
const MAX_THROTTLE = 1_000;
const DEFAULT_THROTTLE = 100;

const MIN_BACKGROUND_KEEP_ALIVE_TIMEOUT = 15_000;
const MIN_LOST_CONNECTION_TIMEOUT = 200;
const RECOMMENDED_MIN_LOST_CONNECTION_TIMEOUT = 1_000;
const MAX_LOST_CONNECTION_TIMEOUT = 30_000;
const DEFAULT_LOST_CONNECTION_TIMEOUT = 5_000;

const RESOLVE_USERS_BATCH_DELAY = 50;
const MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY = 50;

export type ResolveMentionSuggestionsArgs = {
  /**
   * The ID of the current room.
   */
  roomId: string;

  /**
   * The text to search for.
   */
  text: string;
};

export type ResolveUsersArgs = {
  /**
   * The IDs of the users to resolve.
   */
  userIds: string[];
};

export type EnterOptions<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
> = Resolve<
  // Enter options are just room initializers, plus an internal option
  RoomInitializers<TPresence, TStorage> & {
    /**
     * Only necessary when you’re using Liveblocks with React v17 or lower.
     *
     * If so, pass in a reference to `ReactDOM.unstable_batchedUpdates` here.
     * This will allow Liveblocks to circumvent the so-called "zombie child
     * problem". To learn more, see
     * https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child
     */
    unstable_batchedUpdates?: (cb: () => void) => void;
  }
>;

/**
 * @private
 *
 * Private methods and variables used in the core internals, but as a user
 * of Liveblocks, NEVER USE ANY OF THESE DIRECTLY, because bad things
 * will probably happen if you do.
 */
type PrivateClientApi<TUserMeta extends BaseUserMeta> = {
  currentUserIdStore: Store<string | null>;
  resolveMentionSuggestions: ClientOptions["resolveMentionSuggestions"];
  // TODO: Add generic for ThreadMetadata to Client, it could be used here and for inbox notifications too
  cacheStore: CacheStore<BaseMetadata>;
  usersStore: BatchStore<TUserMeta["info"] | undefined, [string]>;
};

type InboxNotificationsApi<TThreadMetadata extends BaseMetadata = never> = {
  /**
   * @private
   */
  getInboxNotifications(): Promise<{
    inboxNotifications: InboxNotificationData[];
    threads: ThreadData<TThreadMetadata>[];
  }>;

  /**
   * @private
   */
  getUnreadInboxNotificationsCount(): Promise<number>;

  /**
   * @private
   */
  markAllInboxNotificationsAsRead(): Promise<void>;

  /**
   * @private
   */
  markInboxNotificationAsRead(inboxNotificationId: string): Promise<void>;
};

export type Client<TUserMeta extends BaseUserMeta = BaseUserMeta> =
  InboxNotificationsApi & {
    /**
     * Gets a room. Returns null if {@link Client.enter} has not been called previously.
     *
     * @param roomId The id of the room
     */
    getRoom<
      TPresence extends JsonObject,
      TStorage extends LsonObject = LsonObject,
      TUserMeta extends BaseUserMeta = BaseUserMeta,
      TRoomEvent extends Json = never,
    >(
      roomId: string
    ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null;

    /**
     * Enter a room.
     * @param roomId The id of the room
     * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
     * @returns The room and a leave function. Call the returned leave() function when you no longer need the room.
     */
    enterRoom<
      TPresence extends JsonObject,
      TStorage extends LsonObject = LsonObject,
      TUserMeta extends BaseUserMeta = BaseUserMeta,
      TRoomEvent extends Json = never,
    >(
      roomId: string,
      options: EnterOptions<TPresence, TStorage>
    ): {
      room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
      leave: () => void;
    };

    /**
     * @deprecated - Prefer using {@link Client.enterRoom} instead.
     *
     * Enters a room and returns it.
     * @param roomId The id of the room
     * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
     */
    enter<
      TPresence extends JsonObject,
      TStorage extends LsonObject = LsonObject,
      TUserMeta extends BaseUserMeta = BaseUserMeta,
      TRoomEvent extends Json = never,
    >(
      roomId: string,
      options: EnterOptions<TPresence, TStorage>
    ): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

    /**
     * @deprecated - Prefer using {@link Client.enterRoom} and calling the returned leave function instead, which is safer.
     *
     * Forcefully leaves a room.
     *
     * Only call this if you know for sure there are no other "instances" of this
     * room used elsewhere in your application. Force-leaving can trigger
     * unexpected conditions in other parts of your application that may not
     * expect this.
     *
     * @param roomId The id of the room
     */
    leave(roomId: string): void;

    /**
     * Purges all cached auth tokens and reconnects all rooms that are still
     * connected, if any.
     *
     * Call this whenever you log out a user in your application.
     */
    logout(): void;

    /**
     * @private
     *
     * Private methods and variables used in the core internals, but as a user
     * of Liveblocks, NEVER USE ANY OF THESE DIRECTLY, because bad things
     * will probably happen if you do.
     */
    readonly [kInternal]: PrivateClientApi<TUserMeta>;
  };

export type AuthEndpoint =
  | string
  | ((room?: string) => Promise<CustomAuthenticationResult>);

/**
 * The authentication endpoint that is called to ensure that the current user has access to a room.
 * Can be an url or a callback if you need to add additional headers.
 */
export type ClientOptions<TUserMeta extends BaseUserMeta = BaseUserMeta> = {
  throttle?: number; // in milliseconds
  lostConnectionTimeout?: number; // in milliseconds
  backgroundKeepAliveTimeout?: number; // in milliseconds
  polyfills?: Polyfills;
  unstable_fallbackToHTTP?: boolean;

  /**
   * @deprecated Use `polyfills: { fetch: ... }` instead.
   * This option will be removed in a future release.
   */
  fetchPolyfill?: Polyfills["fetch"];

  /**
   * @deprecated Use `polyfills: { WebSocket: ... }` instead.
   * This option will be removed in a future release.
   */
  WebSocketPolyfill?: Polyfills["WebSocket"];

  /**
   * @beta
   *
   * A function that returns a list of user IDs matching a string.
   */
  resolveMentionSuggestions?: (
    args: ResolveMentionSuggestionsArgs
  ) => OptionalPromise<string[]>;

  /**
   * @beta
   *
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(TUserMeta["info"] | undefined)[] | undefined>;

  /**
   * @internal To point the client to a different Liveblocks server. Only
   * useful for Liveblocks developers. Not for end users.
   */
  baseUrl?: string;

  /** @internal */
  mockedDelegates?: RoomDelegates;

  /** @internal */
  enableDebugLogging?: boolean;
} & (
  | { publicApiKey: string; authEndpoint?: never }
  | { publicApiKey?: never; authEndpoint: AuthEndpoint }
);
// ^^^^^^^^^^^^^^^
// NOTE: Potential upgrade path by introducing a new property:
//
//   | { publicApiKey: string; authEndpoint?: never; authUrl?: never }
//   | { publicApiKey?: never; authEndpoint: AuthEndpoint; authUrl?: never }
//   | { publicApiKey?: never; authEndpoint?: never; authUrl?: AuthUrl }
//
// Where:
//
//   export type AuthUrl =
//     | string
//     | ((room: string) => Promise<{ token: string }>);
//

export type GetInboxNotificationsOptions = {
  limit?: number;
};

function getBaseUrlFromClientOptions(clientOptions: ClientOptions) {
  if ("liveblocksServer" in clientOptions) {
    throw new Error("Client option no longer supported");
  }
  if (
    typeof clientOptions.baseUrl === "string" &&
    clientOptions.baseUrl.startsWith("http") // Must be http or https URL
  ) {
    return clientOptions.baseUrl;
  } else {
    return DEFAULT_BASE_URL;
  }
}

export function getAuthBearerHeaderFromAuthValue(authValue: AuthValue): string {
  if (authValue.type === "public") {
    return authValue.publicApiKey;
  } else {
    return authValue.token.raw;
  }
}

/**
 * Create a client that will be responsible to communicate with liveblocks servers.
 *
 * @example
 * const client = createClient({
 *   authEndpoint: "/api/auth"
 * });
 *
 * // It's also possible to use a function to call your authentication endpoint.
 * // Useful to add additional headers or use an API wrapper (like Firebase functions)
 * const client = createClient({
 *   authEndpoint: async (room?) => {
 *     const response = await fetch("/api/auth", {
 *       method: "POST",
 *       headers: {
 *          Authentication: "token",
 *          "Content-Type": "application/json"
 *       },
 *       body: JSON.stringify({ room })
 *     });
 *
 *     return await response.json(); // should be: { token: "..." }
 *   }
 * });
 */
export function createClient<TUserMeta extends BaseUserMeta = BaseUserMeta>(
  options: ClientOptions<TUserMeta>
): Client<TUserMeta> {
  type OpaqueRoom = Room<JsonObject, LsonObject, BaseUserMeta, Json>;

  const clientOptions = options;
  const throttleDelay = getThrottle(clientOptions.throttle ?? DEFAULT_THROTTLE);
  const lostConnectionTimeout = getLostConnectionTimeout(
    clientOptions.lostConnectionTimeout ?? DEFAULT_LOST_CONNECTION_TIMEOUT
  );
  const backgroundKeepAliveTimeout = getBackgroundKeepAliveTimeout(
    clientOptions.backgroundKeepAliveTimeout
  );
  const baseUrl = getBaseUrlFromClientOptions(clientOptions);

  const authManager = createAuthManager(options);

  type RoomInfo = {
    room: OpaqueRoom;
    unsubs: Set<() => void>;
  };

  const roomsById = new Map<string, RoomInfo>();

  const notificationsApi = createInboxNotificationsApi(fetchClientApi);

  function teardownRoom(room: OpaqueRoom) {
    unlinkDevTools(room.id);
    roomsById.delete(room.id);
    room.destroy();
  }

  function leaseRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject,
    TUserMeta extends BaseUserMeta,
    TRoomEvent extends Json,
  >(
    info: RoomInfo
  ): {
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
    leave: () => void;
  } {
    // Create a new self-destructing leave function
    const leave = () => {
      const self = leave; // A reference to the currently executing function itself

      if (!info.unsubs.delete(self)) {
        console.warn(
          "This leave function was already called. Calling it more than once has no effect."
        );
      } else {
        // Was this the last room lease? If so, tear down the room
        if (info.unsubs.size === 0) {
          teardownRoom(info.room);
        }
      }
    };

    info.unsubs.add(leave);
    return {
      room: info.room as Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
      leave,
    };
  }

  function enterRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): {
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
    leave: () => void;
  } {
    const existing = roomsById.get(roomId);
    if (existing !== undefined) {
      return leaseRoom(existing);
    }

    deprecateIf(
      options.initialPresence === null || options.initialPresence === undefined,
      "Please provide an initial presence value for the current user when entering the room."
    );

    const newRoom = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
      {
        initialPresence: options.initialPresence ?? {},
        initialStorage: options.initialStorage,
      },
      {
        roomId,
        throttleDelay,
        lostConnectionTimeout,
        backgroundKeepAliveTimeout,
        polyfills: clientOptions.polyfills,
        delegates: clientOptions.mockedDelegates ?? {
          createSocket: makeCreateSocketDelegateForRoom(
            roomId,
            baseUrl,
            clientOptions.polyfills?.WebSocket
          ),
          authenticate: makeAuthDelegateForRoom(roomId, authManager),
        },
        enableDebugLogging: clientOptions.enableDebugLogging,
        unstable_batchedUpdates: options?.unstable_batchedUpdates,
        baseUrl,
        unstable_fallbackToHTTP: !!clientOptions.unstable_fallbackToHTTP,
      }
    );

    const newRoomInfo: RoomInfo = {
      room: newRoom,
      unsubs: new Set(),
    };
    roomsById.set(roomId, newRoomInfo);

    setupDevTools(() => Array.from(roomsById.keys()));
    linkDevTools(roomId, newRoom);

    const shouldConnect =
      options.autoConnect ?? options.shouldInitiallyConnect ?? true;
    if (shouldConnect) {
      // we need to check here because nextjs would fail earlier with Node < 16
      if (typeof atob === "undefined") {
        if (clientOptions.polyfills?.atob === undefined) {
          throw new Error(
            "You need to polyfill atob to use the client in your environment. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/atob-polyfill"
          );
        }
        // At this point, atob does not exist so we are either on React Native or on Node < 16, hence global is available.
        global.atob = clientOptions.polyfills.atob;
      }

      newRoom.connect();
    }

    return leaseRoom(newRoomInfo);
  }

  function enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
    const { room, leave: _ } = enterRoom<
      TPresence,
      TStorage,
      TUserMeta,
      TRoomEvent
    >(roomId, options);
    return room;
  }

  function getRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(roomId: string): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null {
    const room = roomsById.get(roomId)?.room;
    return room
      ? (room as Room<TPresence, TStorage, TUserMeta, TRoomEvent>)
      : null;
  }

  function forceLeave(roomId: string) {
    const unsubs = roomsById.get(roomId)?.unsubs ?? new Set();
    for (const unsub of unsubs) {
      unsub();
    }
  }

  function logout() {
    authManager.reset();

    // Reconnect all rooms that aren't idle, if any. This ensures that those
    // rooms will get reauthorized now that the auth cache is reset. If that
    // fails, they might disconnect.
    for (const { room } of roomsById.values()) {
      if (!isIdle(room.getStatus())) {
        room.reconnect();
      }
    }
  }

  const currentUserIdStore = createStore<string | null>(null);

  async function fetchClientApi(
    endpoint: string,
    options?: RequestInit
  ): Promise<Response> {
    const authValue = await authManager.getAuthValue();

    if (
      authValue.type !== "secret" ||
      authValue.token.parsed.k === TokenKind.SECRET_LEGACY
    ) {
      throw new Error("TODO");
    }

    const userId = authValue.token.parsed.uid;
    currentUserIdStore.set(() => userId);

    const url = new URL(`/v2/c${endpoint}`, baseUrl);
    const fetcher =
      clientOptions.polyfills?.fetch || /* istanbul ignore next */ fetch;
    return await fetcher(url.toString(), {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getAuthBearerHeaderFromAuthValue(authValue)}`,
      },
    });
  }

  const cacheStore = createClientStore();

  const resolveUsers = clientOptions.resolveUsers;
  let hasWarnedIfNoResolveUsers = false;

  const usersStore = createBatchStore(
    async (batchedUserIds: [string][]) => {
      const userIds = batchedUserIds.flat();

      if (
        !hasWarnedIfNoResolveUsers &&
        !resolveUsers &&
        process.env.NODE_ENV !== "production"
      ) {
        console.warn(
          "Set the resolveUsers option in createClient to specify user info."
        );
        hasWarnedIfNoResolveUsers = true;
      }

      const users = await resolveUsers?.({ userIds });

      return users ?? userIds.map(() => undefined);
    },
    { delay: RESOLVE_USERS_BATCH_DELAY }
  );

  return Object.defineProperty(
    {
      logout,

      // Old, deprecated APIs
      enter,
      getRoom,
      leave: forceLeave,

      // New, preferred API
      enterRoom,

      // Notifications API
      ...notificationsApi,

      // Internal
      [kInternal]: {
        currentUserIdStore,
        resolveMentionSuggestions: clientOptions.resolveMentionSuggestions,
        cacheStore,
        usersStore,
      },
    },
    kInternal,
    {
      enumerable: false,
    }
  );
}

export class NotificationsApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: JsonObject
  ) {
    super(message);
  }
}

function createInboxNotificationsApi(
  fetchClientApi: (endpoint: string, options?: RequestInit) => Promise<Response>
): InboxNotificationsApi {
  async function fetchJson<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetchClientApi(endpoint, options);

    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let error: NotificationsApiError;

        try {
          const errorBody = (await response.json()) as { message: string };

          error = new NotificationsApiError(
            errorBody.message,
            response.status,
            errorBody
          );
        } catch {
          error = new NotificationsApiError(
            response.statusText,
            response.status
          );
        }

        throw error;
      }
    }

    let body;

    try {
      body = (await response.json()) as T;
    } catch {
      body = {} as T;
    }

    return body;
  }

  async function getInboxNotifications(options?: GetInboxNotificationsOptions) {
    const queryParams = toURLSearchParams({ limit: options?.limit });
    const json = await fetchJson<{
      // [comments-unread] TODO: How do we type ThreadMetadata?
      threads: ThreadDataPlain[];
      inboxNotifications: InboxNotificationDataPlain[];
    }>(`/inbox-notifications?${queryParams.toString()}`);

    return {
      threads: json.threads.map((thread) => convertToThreadData(thread)),
      inboxNotifications: json.inboxNotifications.map((notification) =>
        convertToInboxNotificationData(notification)
      ),
    };
  }

  async function getUnreadInboxNotificationsCount() {
    const { count } = await fetchJson<{
      count: number;
    }>("/inbox-notifications/count");

    return count;
  }

  async function markAllInboxNotificationsAsRead() {
    await fetchJson("/inbox-notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inboxNotificationIds: "all" }),
    });
  }

  async function markInboxNotificationsAsRead(inboxNotificationIds: string[]) {
    await fetchJson("/inbox-notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inboxNotificationIds }),
    });
  }

  const batchedMarkInboxNotificationsAsRead = new Batch(
    async (batchedInboxNotificationIds: [string][]) => {
      const inboxNotificationIds = batchedInboxNotificationIds.flat();

      await markInboxNotificationsAsRead(inboxNotificationIds);

      return inboxNotificationIds;
    },
    { delay: MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY }
  );

  async function markInboxNotificationAsRead(inboxNotificationId: string) {
    await batchedMarkInboxNotificationsAsRead.get(inboxNotificationId);
  }

  return {
    getInboxNotifications,
    getUnreadInboxNotificationsCount,
    markAllInboxNotificationsAsRead,
    markInboxNotificationAsRead,
  };
}

function checkBounds(
  option: string,
  value: unknown,
  min: number,
  max?: number,
  recommendedMin?: number
): number {
  if (
    typeof value !== "number" ||
    value < min ||
    (max !== undefined && value > max)
  ) {
    throw new Error(
      max !== undefined
        ? `${option} should be between ${recommendedMin ?? min} and ${max}.`
        : `${option} should be at least ${recommendedMin ?? min}.`
    );
  }
  return value;
}

function getBackgroundKeepAliveTimeout(
  value: number | undefined
): number | undefined {
  if (value === undefined) return undefined;
  return checkBounds(
    "backgroundKeepAliveTimeout",
    value,
    MIN_BACKGROUND_KEEP_ALIVE_TIMEOUT
  );
}

function getThrottle(value: number): number {
  return checkBounds("throttle", value, MIN_THROTTLE, MAX_THROTTLE);
}

function getLostConnectionTimeout(value: number): number {
  return checkBounds(
    "lostConnectionTimeout",
    value,
    MIN_LOST_CONNECTION_TIMEOUT,
    MAX_LOST_CONNECTION_TIMEOUT,
    RECOMMENDED_MIN_LOST_CONNECTION_TIMEOUT
  );
}

/**
 * Safely but conveniently build a URLSearchParams instance from a given
 * dictionary of values. For example:
 *
 *   {
 *     "foo": "bar+qux/baz",
 *     "empty": "",
 *     "n": 42,
 *     "nope": undefined,
 *     "alsonope": null,
 *   }
 *
 * Will produce a value that will get serialized as
 * `foo=bar%2Bqux%2Fbaz&empty=&n=42`.
 *
 * Notice how the number is converted to its string representation
 * automatically and the `null`/`undefined` values simply don't end up in the
 * URL.
 */
function toURLSearchParams(
  params: Record<string, string | number | null | undefined>
): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result.set(key, value.toString());
    }
  }
  return result;
}
