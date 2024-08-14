import type { AuthValue } from "./auth-manager";
import { createAuthManager } from "./auth-manager";
import { isIdle } from "./connection";
import { DEFAULT_BASE_URL } from "./constants";
import type { LsonObject } from "./crdts/Lson";
import { linkDevTools, setupDevTools, unlinkDevTools } from "./devtools";
import type { DE, DM, DP, DRI, DS, DU } from "./globals/augmentation";
import { kInternal } from "./internal";
import type { BatchStore } from "./lib/batch";
import { Batch, createBatchStore } from "./lib/batch";
import type { Store } from "./lib/create-store";
import { createStore } from "./lib/create-store";
import * as console from "./lib/fancy-console";
import type { Json, JsonObject } from "./lib/Json";
import type { NoInfr } from "./lib/NoInfer";
import type { Resolve } from "./lib/Resolve";
import { createNotificationsApi } from "./notifications";
import type { CustomAuthenticationResult } from "./protocol/Authentication";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type {
  BaseMetadata,
  ThreadData,
  ThreadDeleteInfo,
} from "./protocol/Comments";
import type {
  InboxNotificationData,
  InboxNotificationDeleteInfo,
} from "./protocol/InboxNotifications";
import type {
  OpaqueRoom,
  OptionalTupleUnless,
  PartialUnless,
  Polyfills,
  Room,
  RoomDelegates,
} from "./room";
import {
  createRoom,
  makeAuthDelegateForRoom,
  makeCreateSocketDelegateForRoom,
} from "./room";
import type { CacheStore } from "./store";
import { createClientStore } from "./store";
import type { OptionalPromise } from "./types/OptionalPromise";

const MIN_THROTTLE = 16;
const MAX_THROTTLE = 1_000;
const DEFAULT_THROTTLE = 100;

const MIN_BACKGROUND_KEEP_ALIVE_TIMEOUT = 15_000;
const MIN_LOST_CONNECTION_TIMEOUT = 200;
const RECOMMENDED_MIN_LOST_CONNECTION_TIMEOUT = 1_000;
const MAX_LOST_CONNECTION_TIMEOUT = 30_000;
const DEFAULT_LOST_CONNECTION_TIMEOUT = 5_000;

const RESOLVE_USERS_BATCH_DELAY = 50;
const RESOLVE_ROOMS_INFO_BATCH_DELAY = 50;

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

export type ResolveRoomsInfoArgs = {
  /**
   * The IDs of the rooms to resolve.
   */
  roomIds: string[];
};

export type EnterOptions<P extends JsonObject = DP, S extends LsonObject = DS> =
  // prettier-ignore
  Resolve<
  {
    /**
     * Whether or not the room automatically connects to Liveblock servers.
     * Default is true.
     *
     * Usually set to false when the client is used from the server to not call
     * the authentication endpoint or connect via WebSocket.
     */
    autoConnect?: boolean;

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

  // Initial presence is only mandatory if the custom type requires it to be
  & PartialUnless<
    P,
    {
      /**
       * The initial Presence to use and announce when you enter the Room. The
       * Presence is available on all users in the Room (me & others).
       */
      initialPresence: P | ((roomId: string) => P);
    }
  >
  
  // Initial storage is only mandatory if the custom type requires it to be
  & PartialUnless<
    S,
    {
      /**
       * The initial Storage to use when entering a new Room.
       */
      initialStorage: S | ((roomId: string) => S);
    }
  >
>;

/**
 * @private
 *
 * Private methods and variables used in the core internals, but as a user
 * of Liveblocks, NEVER USE ANY OF THESE DIRECTLY, because bad things
 * will probably happen if you do.
 */
export type PrivateClientApi<U extends BaseUserMeta, M extends BaseMetadata> = {
  readonly currentUserIdStore: Store<string | null>;
  readonly resolveMentionSuggestions: ClientOptions<U>["resolveMentionSuggestions"];
  readonly cacheStore: CacheStore<BaseMetadata>;
  readonly usersStore: BatchStore<U["info"] | undefined, string>;
  readonly roomsInfoStore: BatchStore<DRI | undefined, string>;
  readonly getRoomIds: () => string[];
  readonly getThreads: () => Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    requestedAt: Date;
  }>;
  readonly getThreadsSince: (options: { since: Date }) => Promise<{
    inboxNotifications: {
      updated: InboxNotificationData[];
      deleted: InboxNotificationDeleteInfo[];
    };
    threads: {
      updated: ThreadData<M>[];
      deleted: ThreadDeleteInfo[];
    };
    requestedAt: Date;
  }>;
};

export type NotificationsApi<M extends BaseMetadata> = {
  /**
   * Gets the current user inbox notifications and their associated threads.
   * It also returns the request date that can be used for subsequent polling.
   *
   * @example
   * const {
   *   inboxNotifications,
   *   threads,
   *   requestedAt
   * } = await client.getInboxNotifications();
   */
  getInboxNotifications(): Promise<{
    inboxNotifications: InboxNotificationData[];
    threads: ThreadData<M>[];
    requestedAt: Date;
  }>;

  /**
   * Gets the updated and deleted inbox notifications and their associated threads since the requested date.
   *
   * @example
   * const result = await client.getInboxNotifications();
   * // ... //
   * await client.getInboxNotificationsSince({ since: result.requestedAt }});
   */
  getInboxNotificationsSince(options: { since: Date }): Promise<{
    inboxNotifications: {
      updated: InboxNotificationData[];
      deleted: InboxNotificationDeleteInfo[];
    };
    threads: {
      updated: ThreadData<M>[];
      deleted: ThreadDeleteInfo[];
    };
    requestedAt: Date;
  }>;

  /**
   * Gets the number of unread inbox notifications for the current user.
   *
   * @example
   * const count = await client.getUnreadInboxNotificationsCount();
   */
  getUnreadInboxNotificationsCount(): Promise<number>;

  /**
   * Marks all inbox notifications as read.
   *
   * @example
   * await client.markAllInboxNotificationsAsRead();
   */
  markAllInboxNotificationsAsRead(): Promise<void>;

  /**
   * Marks an inbox notification as read.
   *
   * @example
   * await client.markInboxNotificationAsRead("in_xxx");
   */
  markInboxNotificationAsRead(inboxNotificationId: string): Promise<void>;

  /**
   * Deletes all inbox notifications for the current user.
   *
   * @example
   * await client.deleteAllInboxNotifications();
   */
  deleteAllInboxNotifications(): Promise<void>;

  /**
   * Deletes an inbox notification for the current user.
   *
   * @example
   * await client.deleteInboxNotification("in_xxx");
   */
  deleteInboxNotification(inboxNotificationId: string): Promise<void>;
};

/**
 * @private Widest-possible Client type, matching _any_ Client instance. Note
 * that this type is different from `Client`-without-type-arguments. That
 * represents a Client instance using globally augmented types only, which is
 * narrower.
 */
export type OpaqueClient = Client<BaseUserMeta>;

export type Client<U extends BaseUserMeta = DU, M extends BaseMetadata = DM> = {
  /**
   * Gets a room. Returns null if {@link Client.enter} has not been called previously.
   *
   * @param roomId The id of the room
   */
  getRoom<
    P extends JsonObject = DP,
    S extends LsonObject = DS,
    E extends Json = DE,
    M extends BaseMetadata = DM,
  >(
    roomId: string
  ): Room<P, S, U, E, M> | null;

  /**
   * Enter a room.
   * @param roomId The id of the room
   * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
   * @returns The room and a leave function. Call the returned leave() function when you no longer need the room.
   */
  enterRoom<
    P extends JsonObject = DP,
    S extends LsonObject = DS,
    E extends Json = DE,
    M extends BaseMetadata = DM,
  >(
    roomId: string,
    ...args: OptionalTupleUnless<
      P & S,
      [options: EnterOptions<NoInfr<P>, NoInfr<S>>]
    >
  ): {
    room: Room<P, S, U, E, M>;
    leave: () => void;
  };

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
  // TODO Make this a getter, so we can provide M
  readonly [kInternal]: PrivateClientApi<U, M>;
} & NotificationsApi<M>;

export type AuthEndpoint =
  | string
  | ((room?: string) => Promise<CustomAuthenticationResult>);

/**
 * The authentication endpoint that is called to ensure that the current user has access to a room.
 * Can be an url or a callback if you need to add additional headers.
 */
export type ClientOptions<U extends BaseUserMeta = DU> = {
  throttle?: number; // in milliseconds
  lostConnectionTimeout?: number; // in milliseconds
  backgroundKeepAliveTimeout?: number; // in milliseconds
  polyfills?: Polyfills;
  unstable_fallbackToHTTP?: boolean;
  unstable_streamData?: boolean;

  /**
   * A function that returns a list of user IDs matching a string.
   */
  resolveMentionSuggestions?: (
    args: ResolveMentionSuggestionsArgs
  ) => OptionalPromise<string[]>;

  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;

  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomsInfo?: (
    args: ResolveRoomsInfoArgs
  ) => OptionalPromise<(DRI | undefined)[] | undefined>;

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

function getBaseUrl(baseUrl?: string | undefined): string {
  if (
    typeof baseUrl === "string" &&
    baseUrl.startsWith("http") // Must be http or https URL
  ) {
    return baseUrl;
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
export function createClient<U extends BaseUserMeta = DU>(
  options: ClientOptions<U>
): Client<U> {
  const clientOptions = options;
  const throttleDelay = getThrottle(clientOptions.throttle ?? DEFAULT_THROTTLE);
  const lostConnectionTimeout = getLostConnectionTimeout(
    clientOptions.lostConnectionTimeout ?? DEFAULT_LOST_CONNECTION_TIMEOUT
  );
  const backgroundKeepAliveTimeout = getBackgroundKeepAliveTimeout(
    clientOptions.backgroundKeepAliveTimeout
  );
  const baseUrl = getBaseUrl(clientOptions.baseUrl);

  const authManager = createAuthManager(options);

  type RoomDetails = {
    room: OpaqueRoom;
    unsubs: Set<() => void>;
  };

  const roomsById = new Map<string, RoomDetails>();

  function teardownRoom(room: OpaqueRoom) {
    unlinkDevTools(room.id);
    roomsById.delete(room.id);
    room.destroy();
  }

  function leaseRoom<
    P extends JsonObject,
    S extends LsonObject,
    U extends BaseUserMeta,
    E extends Json,
    M extends BaseMetadata,
  >(
    details: RoomDetails
  ): {
    room: Room<P, S, U, E, M>;
    leave: () => void;
  } {
    // Create a new self-destructing leave function
    const leave = () => {
      const self = leave; // A reference to the currently executing function itself

      if (!details.unsubs.delete(self)) {
        console.warn(
          "This leave function was already called. Calling it more than once has no effect."
        );
      } else {
        // Was this the last room lease? If so, tear down the room
        if (details.unsubs.size === 0) {
          teardownRoom(details.room);
        }
      }
    };

    details.unsubs.add(leave);
    return {
      room: details.room as Room<P, S, U, E, M>,
      leave,
    };
  }

  function enterRoom<
    P extends JsonObject,
    S extends LsonObject,
    U extends BaseUserMeta,
    E extends Json,
    M extends BaseMetadata,
  >(
    roomId: string,
    ...args: OptionalTupleUnless<
      P & S,
      [options: EnterOptions<NoInfr<P>, NoInfr<S>>]
    >
  ): {
    room: Room<P, S, U, E, M>;
    leave: () => void;
  } {
    const existing = roomsById.get(roomId);
    if (existing !== undefined) {
      return leaseRoom(existing);
    }

    const options = args[0] ?? ({} as EnterOptions<P, S>);
    const initialPresence =
      (typeof options.initialPresence === "function"
        ? options.initialPresence(roomId)
        : options.initialPresence) ?? ({} as P);

    const initialStorage =
      (typeof options.initialStorage === "function"
        ? options.initialStorage(roomId)
        : options.initialStorage) ?? ({} as S);

    const newRoom = createRoom<P, S, U, E, M>(
      { initialPresence, initialStorage },
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
        unstable_streamData: !!clientOptions.unstable_streamData,
      }
    );

    const newRoomDetails: RoomDetails = {
      room: newRoom,
      unsubs: new Set(),
    };
    roomsById.set(roomId, newRoomDetails);

    setupDevTools(() => Array.from(roomsById.keys()));
    linkDevTools(roomId, newRoom);

    const shouldConnect = options.autoConnect ?? true;
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

    return leaseRoom(newRoomDetails);
  }

  function getRoom<
    P extends JsonObject,
    S extends LsonObject,
    U extends BaseUserMeta,
    E extends Json,
    M extends BaseMetadata,
  >(roomId: string): Room<P, S, U, E, M> | null {
    const room = roomsById.get(roomId)?.room;
    return room ? (room as Room<P, S, U, E, M>) : null;
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

  const {
    getInboxNotifications,
    getInboxNotificationsSince,
    getUnreadInboxNotificationsCount,
    markAllInboxNotificationsAsRead,
    markInboxNotificationAsRead,
    deleteAllInboxNotifications,
    deleteInboxNotification,
    getThreads,
    getThreadsSince,
  } = createNotificationsApi({
    baseUrl,
    fetcher: clientOptions.polyfills?.fetch || /* istanbul ignore next */ fetch,
    authManager,
    currentUserIdStore,
  });

  const cacheStore = createClientStore();

  const resolveUsers = clientOptions.resolveUsers;
  const warnIfNoResolveUsers = createDevelopmentWarning(
    () => !resolveUsers,
    "Set the resolveUsers option in createClient to specify user info."
  );

  const batchedResolveUsers = new Batch(
    async (batchedUserIds: string[]) => {
      const userIds = batchedUserIds.flat();
      const users = await resolveUsers?.({ userIds });

      warnIfNoResolveUsers();

      return users ?? userIds.map(() => undefined);
    },
    { delay: RESOLVE_USERS_BATCH_DELAY }
  );
  const usersStore = createBatchStore(batchedResolveUsers);

  const resolveRoomsInfo = clientOptions.resolveRoomsInfo;
  const warnIfNoResolveRoomsInfo = createDevelopmentWarning(
    () => !resolveRoomsInfo,
    "Set the resolveRoomsInfo option in createClient to specify room info."
  );

  const batchedResolveRoomsInfo = new Batch(
    async (batchedRoomIds: string[]) => {
      const roomIds = batchedRoomIds.flat();
      const roomsInfo = await resolveRoomsInfo?.({ roomIds });

      warnIfNoResolveRoomsInfo();

      return roomsInfo ?? roomIds.map(() => undefined);
    },
    { delay: RESOLVE_ROOMS_INFO_BATCH_DELAY }
  );
  const roomsInfoStore = createBatchStore(batchedResolveRoomsInfo);

  return Object.defineProperty(
    {
      enterRoom,
      getRoom,

      logout,

      getInboxNotifications,
      getInboxNotificationsSince,
      getUnreadInboxNotificationsCount,
      markAllInboxNotificationsAsRead,
      markInboxNotificationAsRead,
      deleteAllInboxNotifications,
      deleteInboxNotification,
      getThreads,

      // Internal
      [kInternal]: {
        currentUserIdStore,
        resolveMentionSuggestions: clientOptions.resolveMentionSuggestions,
        cacheStore,
        usersStore,
        roomsInfoStore,
        getRoomIds() {
          return Array.from(roomsById.keys());
        },
        getThreads,
        getThreadsSince,
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
 * Emit a warning only once if a condition is met, in development only.
 */
function createDevelopmentWarning(
  condition: boolean | (() => boolean),
  ...args: Parameters<typeof console.warn>
) {
  let hasWarned = false;

  if (process.env.NODE_ENV !== "production") {
    return () => {
      if (
        !hasWarned &&
        (typeof condition === "function" ? condition() : condition)
      ) {
        console.warn(...args);

        hasWarned = true;
      }
    };
  } else {
    return () => {};
  }
}
