/**
 * NOTE: only types should be imported from @liveblocks/core.
 * This is because this package is made to be used in Node.js, and
 * @liveblocks/core has browser-specific code.
 */
import type {
  Awaitable,
  BaseMetadata,
  BaseUserMeta,
  ClientMsg,
  CommentBody,
  CommentData,
  CommentDataPlain,
  CommentUserReaction,
  CommentUserReactionPlain,
  DAD,
  DE,
  DM,
  DS,
  DU,
  GroupData,
  GroupDataPlain,
  IdTuple,
  InboxNotificationData,
  InboxNotificationDataPlain,
  Json,
  JsonObject,
  KDAD,
  LsonObject,
  NotificationSettings,
  NotificationSettingsPlain,
  Op,
  OptionalTupleUnless,
  PartialNotificationSettings,
  PartialUnless,
  Patchable,
  PlainLsonObject,
  QueryMetadata,
  QueryParams,
  RoomSubscriptionSettings,
  SerializedCrdt,
  StorageUpdate,
  SubscriptionData,
  SubscriptionDataPlain,
  ThreadData,
  ThreadDataPlain,
  ToImmutable,
  URLSafeString,
  UserRoomSubscriptionSettings,
  UserSubscriptionData,
  UserSubscriptionDataPlain,
} from "@liveblocks/core";
import {
  checkBounds,
  ClientMsgCode,
  convertToCommentData,
  convertToCommentUserReaction,
  convertToGroupData,
  convertToInboxNotificationData,
  convertToSubscriptionData,
  convertToThreadData,
  convertToUserSubscriptionData,
  createManagedPool,
  createNotificationSettings,
  isPlainObject,
  LiveObject,
  makeAbortController,
  objectToQuery,
  tryParseJson,
  url,
  urljoin,
} from "@liveblocks/core";

import { asyncConsume, runConcurrently } from "./lib/itertools";
import { LineStream, NdJsonStream } from "./lib/ndjson";
import { Session } from "./Session";
import {
  assertNonEmpty,
  assertSecretKey,
  fetchPolyfill,
  getBaseUrl,
  normalizeStatusCode,
} from "./utils";

// Recursively convert ReadonlyMap<K, V> to { [key: K]: V }
type SerializeMaps<T> =
  T extends ReadonlyMap<infer K, infer V>
    ? K extends string
      ? { readonly [P in K]: SerializeMaps<V> }
      : { readonly [key: string]: SerializeMaps<V> }
    : T extends object
      ? { readonly [P in keyof T]: SerializeMaps<T[P]> }
      : T;

type ToSimplifiedJson<S extends LsonObject> = LsonObject extends S
  ? JsonObject
  : // ToImmutable converts LiveMap instances to ReadonlyMap versions, but
    // the "simplified JSON" format actually requires (because of serialization)
    // and converts the maps to plain objects.
    SerializeMaps<ToImmutable<S>>;

export type LiveblocksOptions = {
  /**
   * The Liveblocks secret key. Must start with "sk_".
   * Get it from https://liveblocks.io/dashboard/apikeys
   */
  secret: string;

  /**
   * @internal To point the client to a different Liveblocks server. Only
   * useful for Liveblocks developers. Not for end users.
   */
  baseUrl?: string;
};

type DateToString<T> = {
  [P in keyof T]: Date extends T[P] ? string : T[P];
};

export type CreateSessionOptions<U extends BaseUserMeta = DU> =
  //
  PartialUnless<U["info"], { userInfo: U["info"] }> & {
    tenantId?: string;
  };

export type IdentifyUserOptions<U extends BaseUserMeta = DU> =
  //
  PartialUnless<U["info"], { userInfo: U["info"] }>;

export type AuthResponse = {
  status: number;
  body: string;
  error?: Error;
};

type Identity = {
  userId: string;
  groupIds: string[];
  tenantId?: string;
};

export type ThreadParticipants = {
  participantIds: string[];
};

export type CreateThreadOptions<M extends BaseMetadata> = {
  roomId: string;
  data: {
    comment: { userId: string; createdAt?: Date; body: CommentBody };
  } & PartialUnless<M, { metadata: M }>;
};

export type RoomPermission =
  | []
  | ["room:write"]
  | ["room:read", "room:presence:write"];
export type RoomAccesses = Record<
  string,
  ["room:write"] | ["room:read", "room:presence:write"]
>;
export type RoomMetadata = Record<string, string | string[]>;
type QueryRoomMetadata = Record<string, string>;

export type RoomData = {
  type: "room";
  id: string;
  createdAt: Date;
  lastConnectionAt?: Date;
  defaultAccesses: RoomPermission;
  usersAccesses: RoomAccesses;
  groupsAccesses: RoomAccesses;
  metadata: RoomMetadata;
};

type RoomDataPlain = DateToString<RoomData>;

export type RoomUser<U extends BaseUserMeta = DU> = {
  type: "user";
  id: string | null;
  connectionId: number;
  info: U["info"];
};

export type Schema = {
  id: string;
  name: string;
  version: number;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

type SchemaPlain = DateToString<Schema>;

type RequestStorageMutationResponse = {
  actor: number;
  nodes: IdTuple<SerializedCrdt>[];
};

export type MutateStorageCallback = (context: {
  root: LiveObject<S>;
}) => Awaitable<void>;
export type MutateStorageOptions = RequestOptions;

export type MassMutateStorageCallback = (context: {
  room: RoomData;
  root: LiveObject<S>;
}) => Awaitable<void>;

// prettier-ignore
export type MassMutateStorageOptions =
  & MutateStorageOptions
  & { concurrency?: number };

// NOTE: We should _never_ rely on using the default types (DS, DU, DE, ...)
// inside the Liveblocks implementation. We should only rely on the type
// "params" (S, U, E, ...) instead, where the concrete type is bound to the
// class. In this case, we're not doing that at the class level, but globally.
// The idea is that we "start small" and could always add them in at the class
// level later.
type E = DE;
type M = DM;
type S = DS;
type U = DU;

export type RoomsQueryCriteria = {
  userId?: string;
  groupIds?: string[];
  /**
   * The query to filter rooms by. It is based on our query language.
   * @example
   * ```
   * {
   *   query: 'metadata["status"]:"open" AND roomId^"liveblocks:"'
   * }
   * ```
   * @example
   * ```
   * {
   *   query: {
   *     metadata: {
   *       status: "open",
   *     },
   *     roomId: {
   *       startsWith: "liveblocks:"
   *     }
   *   }
   * }
   * ```
   */
  query?:
    | string
    | {
        metadata?: QueryRoomMetadata;
        roomId?: {
          startsWith: string;
        };
      };
};

export type InboxNotificationsQueryCriteria = {
  userId: string;
  tenantId?: string;
  /**
   * The query to filter inbox notifications by. It is based on our query language.
   *
   * @example
   * ```
   * {
   *  query: "unread:true"
   * }
   * ```
   *
   * @example
   * ```
   * {
   *   query: {
   *     unread: true
   *   }
   * }
   * ```
   *
   */
  query?: string | { unread: boolean };
};

export type PaginationOptions = {
  limit?: number;
  startingAfter?: string;
};

export type Page<T> = {
  nextCursor: string | null;
  data: T[];
};

// prettier-ignore
export type GetRoomsOptions =
  & RoomsQueryCriteria
  & PaginationOptions

// prettier-ignore
export type GetInboxNotificationsOptions =
  & InboxNotificationsQueryCriteria
  & PaginationOptions;

export type CreateRoomOptions = {
  defaultAccesses: RoomPermission;
  groupsAccesses?: RoomAccesses;
  usersAccesses?: RoomAccesses;
  metadata?: RoomMetadata;
  tenantId?: string;
};

export type UpdateRoomOptions = {
  defaultAccesses?: RoomPermission | null;
  groupsAccesses?: Record<
    string,
    ["room:write"] | ["room:read", "room:presence:write"] | null
  >;
  usersAccesses?: Record<
    string,
    ["room:write"] | ["room:read", "room:presence:write"] | null
  >;
  metadata?: Record<string, string | string[] | null>;
};

export type UpsertRoomOptions = {
  update: UpdateRoomOptions;
  create?: CreateRoomOptions;
};

export type RequestOptions = {
  signal?: AbortSignal;
};

/**
 * Converts ISO-formatted date strings to Date instances on RoomDataPlain
 * values.
 */
function inflateRoomData(room: RoomDataPlain): RoomData {
  const createdAt = new Date(room.createdAt);
  const lastConnectionAt = room.lastConnectionAt
    ? new Date(room.lastConnectionAt)
    : undefined;

  return {
    ...room,
    createdAt,
    lastConnectionAt,
  };
}

/**
 * Interact with the Liveblocks API from your Node.js backend.
 */
export class Liveblocks {
  readonly #secret: string;
  readonly #baseUrl: URL;

  /**
   * Interact with the Liveblocks API from your Node.js backend.
   */
  constructor(options: LiveblocksOptions) {
    const options_ = options as Record<string, unknown>;
    const secret = options_.secret;
    assertSecretKey(secret, "secret");
    this.#secret = secret;
    this.#baseUrl = new URL(getBaseUrl(options.baseUrl));
  }

  async #post(
    path: URLSafeString,
    json: Json,
    options?: RequestOptions
  ): Promise<Response> {
    const url = urljoin(this.#baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
      "Content-Type": "application/json",
    };
    const fetch = await fetchPolyfill();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(json),
      signal: options?.signal,
    });
    return res;
  }

  async #put(
    path: URLSafeString,
    json: Json,
    options?: RequestOptions
  ): Promise<Response> {
    const url = urljoin(this.#baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
      "Content-Type": "application/json",
    };
    const fetch = await fetchPolyfill();
    return await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(json),
      signal: options?.signal,
    });
  }

  async #putBinary(
    path: URLSafeString,
    body: Uint8Array,
    params?: QueryParams,
    options?: RequestOptions
  ): Promise<Response> {
    const url = urljoin(this.#baseUrl, path, params);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
      "Content-Type": "application/octet-stream",
    };
    const fetch = await fetchPolyfill();
    return await fetch(url, {
      method: "PUT",
      headers,
      body,
      signal: options?.signal,
    });
  }

  async #delete(
    path: URLSafeString,
    params?: QueryParams,
    options?: RequestOptions
  ): Promise<Response> {
    const url = urljoin(this.#baseUrl, path, params);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
    };
    const fetch = await fetchPolyfill();
    const res = await fetch(url, {
      method: "DELETE",
      headers,
      signal: options?.signal,
    });
    return res;
  }

  async #get(
    path: URLSafeString,
    params?: QueryParams,
    options?: RequestOptions
  ): Promise<Response> {
    const url = urljoin(this.#baseUrl, path, params);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
    };
    const fetch = await fetchPolyfill();
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: options?.signal,
    });
    return res;
  }

  /* -------------------------------------------------------------------------------------------------
   * Authentication
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Prepares a new session to authorize a user to access Liveblocks.
   *
   * IMPORTANT:
   * Always make sure that you trust the user making the request to your
   * backend before calling .prepareSession()!
   *
   * @param userId Tell Liveblocks the user ID of the user to authorize. Must
   * uniquely identify the user account in your system. The uniqueness of this
   * value will determine how many MAUs will be counted/billed.
   *
   * @param tenantId (optional) The tenant ID to authorize the user for.
   *
   * @param options.userInfo Custom metadata to attach to this user. Data you
   * add here will be visible to all other clients in the room, through the
   * `other.info` property.
   *
   */
  prepareSession(
    userId: string,
    ...rest: OptionalTupleUnless<
      CreateSessionOptions<U>,
      [options: CreateSessionOptions<U>]
    >
  ): Session {
    const options = rest[0];
    return new Session(
      this.#post.bind(this),
      userId,
      options?.userInfo,
      options?.tenantId
    );
  }

  /**
   * Call this to authenticate the user as an actor you want to allow to use
   * Liveblocks.
   *
   * You should use this method only if you want to manage your permissions
   * through the Liveblocks Permissions API. This method is more complicated to
   * set up, but allows for finer-grained specification of permissions.
   *
   * Calling `.identifyUser()` only lets you securely identify a user (and what
   * groups they belong to). What permissions this user will end up having is
   * determined by whatever permissions you assign the user/group in your
   * Liveblocks account, through the Permissions API:
   * https://liveblocks.io/docs/rooms/permissions
   *
   * IMPORTANT:
   * Always verify that you trust the user making the request before calling
   * .identifyUser()!
   *
   * @param identity Tell Liveblocks the user ID of the user to authenticate.
   * Must uniquely identify the user account in your system. The uniqueness of
   * this value will determine how many MAUs will be counted/billed.
   *
   * If you also want to assign which groups this user belongs to, use the
   * object form and specify the `groupIds` property. Those `groupIds` should
   * match the groupIds you assigned permissions to via the Liveblocks
   * Permissions API, see
   * https://liveblocks.io/docs/rooms/permissions#permissions-levels-groups-accesses-example
   *
   * @param options.userInfo Custom metadata to attach to this user. Data you
   * add here will be visible to all other clients in the room, through the
   * `other.info` property.
   */
  // These fields define the security identity of the user. Whatever you pass in here will define which
  public async identifyUser(
    identity:
      | string // Shorthand for userId
      | Identity,
    ...rest: OptionalTupleUnless<
      IdentifyUserOptions<U>,
      [options: IdentifyUserOptions<U>]
    >
  ): Promise<AuthResponse> {
    const options = rest[0];

    const path = url`/v2/identify-user`;

    const { userId, groupIds, tenantId } =
      typeof identity === "string"
        ? { userId: identity, groupIds: undefined, tenantId: undefined }
        : identity;

    assertNonEmpty(userId, "userId");

    const body = {
      userId,
      groupIds,
      tenantId,
      userInfo: options?.userInfo,
    };

    try {
      const resp = await this.#post(path, body);

      return {
        status: normalizeStatusCode(resp.status),
        body: await resp.text(),
      };
    } catch (er) {
      return {
        status: 503 /* Service Unavailable */,
        body: `Call to ${urljoin(
          this.#baseUrl,
          path
        )} failed. See "error" for more information.`,
        error: er as Error | undefined,
      };
    }
  }

  /* -------------------------------------------------------------------------------------------------
   * Room
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Returns a list of your rooms. The rooms are returned sorted by creation date, from newest to oldest. You can filter rooms by metadata, users accesses and groups accesses.
   * @param params.limit (optional) A limit on the number of rooms to be returned. The limit can range between 1 and 100, and defaults to 20.
   * @param params.startingAfter (optional) A cursor used for pagination. You get the value from the response of the previous page.
   * @param params.userId (optional) A filter on users accesses.
   * @param params.metadata (optional) A filter on metadata. Multiple metadata keys can be used to filter rooms.
   * @param params.groupIds (optional) A filter on groups accesses. Multiple groups can be used.
   * @param params.tenantId (optional) A filter on tenant ID.
   * @param params.query (optional) A query to filter rooms by. It is based on our query language. You can filter by metadata and room ID.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns A list of rooms.
   */
  public async getRooms(
    params: GetRoomsOptions = {},
    options?: RequestOptions
  ): Promise<Page<RoomData>> {
    const path = url`/v2/rooms`;

    let query: string | undefined;

    if (typeof params.query === "string") {
      query = params.query;
    } else if (typeof params.query === "object") {
      query = objectToQuery(params.query);
    }

    const queryParams = {
      limit: params.limit,
      startingAfter: params.startingAfter,
      userId: params.userId,
      groupIds: params.groupIds ? params.groupIds.join(",") : undefined,
      query,
    };

    const res = await this.#get(path, queryParams, options);
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const page = (await res.json()) as Page<RoomDataPlain>;
    const rooms: RoomData[] = page.data.map(inflateRoomData);
    return {
      ...page,
      data: rooms,
    };
  }

  /**
   * Iterates over all rooms that match the given criteria.
   *
   * The difference with .getRooms() is that pagination will happen
   * automatically under the hood, using the given `pageSize`.
   *
   * @param criteria.userId (optional) A filter on users accesses.
   * @param criteria.groupIds (optional) A filter on groups accesses. Multiple groups can be used.
   * @param criteria.query.roomId (optional) A filter by room ID.
   * @param criteria.query.metadata (optional) A filter by metadata.
   *
   * @param options.pageSize (optional) The page size to use for each request.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  async *iterRooms(
    criteria: RoomsQueryCriteria,
    options?: RequestOptions & { pageSize?: number }
  ): AsyncGenerator<RoomData> {
    // TODO Dry up this async iterable implementation for pagination
    const { signal } = options ?? {};
    const pageSize = checkBounds("pageSize", options?.pageSize ?? 40, 20);

    let cursor: string | undefined = undefined;
    while (true) {
      const { nextCursor, data } = await this.getRooms(
        { ...criteria, startingAfter: cursor, limit: pageSize },
        { signal }
      );
      for (const item of data) {
        yield item;
      }
      if (!nextCursor) {
        break;
      }
      cursor = nextCursor;
    }
  }

  /**
   * Creates a new room with the given id.
   * @param roomId The id of the room to create.
   * @param params.defaultAccesses The default accesses for the room.
   * @param params.groupsAccesses (optional) The group accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.usersAccesses (optional) The user accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @param params.tenantId (optional) The tenant ID to create the room for.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The created room.
   */
  public async createRoom(
    roomId: string,
    params: CreateRoomOptions,
    options?: RequestOptions & { idempotent?: boolean }
  ): Promise<RoomData> {
    const { defaultAccesses, groupsAccesses, usersAccesses, metadata } = params;

    const res = await this.#post(
      options?.idempotent ? url`/v2/rooms?idempotent` : url`/v2/rooms`,
      {
        id: roomId,
        defaultAccesses,
        groupsAccesses,
        usersAccesses,
        metadata,
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as RoomDataPlain;
    return inflateRoomData(data);
  }

  /**
   * Returns a room with the given id, or creates one with the given creation
   * options if it doesn't exist yet.
   *
   * @param roomId The id of the room.
   * @param params.defaultAccesses The default accesses for the room if the room will be created.
   * @param params.groupsAccesses (optional) The group accesses for the room if the room will be created. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.usersAccesses (optional) The user accesses for the room if the room will be created. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room if the room will be created. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @param params.tenantId (optional) The tenant ID to create the room for.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The room.
   */
  public async getOrCreateRoom(
    roomId: string,
    params: CreateRoomOptions,
    options?: RequestOptions
  ): Promise<RoomData> {
    return await this.createRoom(roomId, params, {
      ...options,
      idempotent: true,
    });
  }

  /**
   * Updates or creates a new room with the given properties.
   *
   * @param roomId The id of the room to update or create.
   * @param update The fields to update. These values will be updated when the room exists, or set when the room does not exist and gets created. Must specify at least one key.
   * @param create (optional) The fields to only use when the room does not exist and will be created. When the room already exists, these values are ignored.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The room.
   */
  public async upsertRoom(
    roomId: string,
    params: UpsertRoomOptions,
    options?: RequestOptions
  ): Promise<RoomData> {
    const res = await this.#post(
      url`/v2/rooms/${roomId}/upsert`,
      params,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as RoomDataPlain;
    return inflateRoomData(data);
  }

  /**
   * Returns a room with the given id.
   * @param roomId The id of the room to return.
   * @returns The room with the given id.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getRoom(
    roomId: string,
    options?: RequestOptions
  ): Promise<RoomData> {
    const res = await this.#get(url`/v2/rooms/${roomId}`, undefined, options);

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as RoomDataPlain;
    return inflateRoomData(data);
  }

  /**
   * Updates specific properties of a room. It’s not necessary to provide the entire room’s information.
   * Setting a property to `null` means to delete this property.
   * @param roomId The id of the room to update.
   * @param params.defaultAccesses (optional) The default accesses for the room.
   * @param params.groupsAccesses (optional) The group accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.usersAccesses (optional) The user accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The updated room.
   */
  public async updateRoom(
    roomId: string,
    params: UpdateRoomOptions,
    options?: RequestOptions
  ): Promise<RoomData> {
    const { defaultAccesses, groupsAccesses, usersAccesses, metadata } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}`,
      {
        defaultAccesses,
        groupsAccesses,
        usersAccesses,
        metadata,
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as RoomDataPlain;
    return inflateRoomData(data);
  }

  /**
   * Deletes a room with the given id. A deleted room is no longer accessible from the API or the dashboard and it cannot be restored.
   * @param roomId The id of the room to delete.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteRoom(
    roomId: string,
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#delete(
      url`/v2/rooms/${roomId}`,
      undefined,
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Returns a list of users currently present in the requested room. For better performance, we recommand to call this endpoint every 10 seconds maximum. Duplicates can happen if a user is in the requested room with multiple browser tabs opened.
   * @param roomId The id of the room to get the users from.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns A list of users currently present in the requested room.
   */
  public async getActiveUsers(
    roomId: string,
    options?: RequestOptions
  ): Promise<{ data: RoomUser<U>[] }> {
    const res = await this.#get(
      url`/v2/rooms/${roomId}/active_users`,
      undefined,
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return (await res.json()) as Promise<{ data: RoomUser<U>[] }>;
  }

  /**
   * Boadcasts an event to a room without having to connect to it via the client from @liveblocks/client. The connectionId passed to event listeners is -1 when using this API.
   * @param roomId The id of the room to broadcast the event to.
   * @param message The message to broadcast. It can be any JSON serializable value.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async broadcastEvent(
    roomId: string,
    message: E,
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#post(
      url`/v2/rooms/${roomId}/broadcast_event`,
      message,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /* -------------------------------------------------------------------------------------------------
   * Storage
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Returns the contents of the room’s Storage tree.
   * The default outputted format is called “plain LSON”, which includes information on the Live data structures in the tree.
   * These nodes show up in the output as objects with two properties:
   *
   * ```json
   * {
   *   "liveblocksType": "LiveObject",
   *   "data": ...
   * }
   * ```
   *
   * If you’re not interested in this information, you can use the `format` parameter to get a more compact output.
   *
   * @param roomId The id of the room to get the storage from.
   * @param format (optional) Set to return `plan-lson` representation by default. If set to `json`, the output will be formatted as a simplified JSON representation of the Storage tree.
   * @param options.signal (optional) An abort signal to cancel the request.
   * In that format, each LiveObject and LiveMap will be formatted as a simple JSON object, and each LiveList will be formatted as a simple JSON array. This is a lossy format because information about the original data structures is not retained, but it may be easier to work with.
   */
  public getStorageDocument(
    roomId: string,
    format: "plain-lson",
    options?: RequestOptions
  ): Promise<PlainLsonObject>;

  public getStorageDocument(roomId: string): Promise<PlainLsonObject>; // Default to 'plain-lson' when no format is provided

  public getStorageDocument(
    roomId: string,
    format: "json",
    options?: RequestOptions
  ): Promise<ToSimplifiedJson<S>>;

  public async getStorageDocument(
    roomId: string,
    format: "plain-lson" | "json" = "plain-lson",
    options?: RequestOptions
  ): Promise<PlainLsonObject | ToSimplifiedJson<S>> {
    const res = await this.#get(
      url`/v2/rooms/${roomId}/storage`,
      { format },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return (await res.json()) as PlainLsonObject | ToSimplifiedJson<S>;
  }

  async #requestStorageMutation(
    roomId: string,
    options?: RequestOptions
  ): Promise<RequestStorageMutationResponse> {
    const resp = await this.#post(
      url`/v2/rooms/${roomId}/request-storage-mutation`,
      {},
      options
    );
    if (!resp.ok) {
      throw await LiveblocksError.from(resp);
    }

    if (resp.headers.get("content-type") !== "application/x-ndjson") {
      throw new Error("Unexpected response content type");
    }
    if (resp.body === null) {
      throw new Error("Unexpected null body in response");
    }

    const stream = resp.body
      .pipeThrough(new TextDecoderStream()) // stream-decode all bytes to utf8 chunks
      .pipeThrough(new LineStream()) // stream those strings by lines
      .pipeThrough(new NdJsonStream()); // parse each line as JSON

    // Read the first element from the NDJson stream and interpret it as the response data
    const iter = stream[Symbol.asyncIterator]();
    const first = (await iter.next()).value;
    if (!isPlainObject(first) || typeof first.actor !== "number") {
      throw new Error("Failed to obtain a unique session");
    }

    // The rest of the stream are all the Storage nodes
    const nodes = (await asyncConsume(iter)) as IdTuple<SerializedCrdt>[];
    return { actor: first.actor, nodes };
  }

  /**
   * Initializes a room’s Storage. The room must already exist and have an empty Storage.
   * Calling this endpoint will disconnect all users from the room if there are any.
   *
   * @param roomId The id of the room to initialize the storage from.
   * @param document The document to initialize the storage with.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The initialized storage document. It is of the same format as the one passed in.
   */
  public async initializeStorageDocument(
    roomId: string,
    document: PlainLsonObject,
    options?: RequestOptions
  ): Promise<PlainLsonObject> {
    const res = await this.#post(
      url`/v2/rooms/${roomId}/storage`,
      document,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return (await res.json()) as Promise<PlainLsonObject>;
  }

  /**
   * Deletes all of the room’s Storage data and disconnect all users from the room if there are any. Note that this does not delete the Yjs document in the room if one exists.
   * @param roomId The id of the room to delete the storage from.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteStorageDocument(
    roomId: string,
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#delete(
      url`/v2/rooms/${roomId}/storage`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /* -------------------------------------------------------------------------------------------------
   * Yjs
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Returns a JSON representation of the room’s Yjs document.
   * @param roomId The id of the room to get the Yjs document from.
   * @param params.format (optional) If true, YText will return formatting.
   * @param params.key (optional) If provided, returns only a single key’s value, e.g. doc.get(key).toJSON().
   * @param params.type (optional) Used with key to override the inferred type, i.e. "ymap" will return doc.get(key, Y.Map).
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns A JSON representation of the room’s Yjs document.
   */
  public async getYjsDocument(
    roomId: string,
    params: { format?: boolean; key?: string; type?: string } = {},
    options?: RequestOptions
  ): Promise<JsonObject> {
    const { format, key, type } = params;

    const path = url`v2/rooms/${roomId}/ydoc`;

    const res = await this.#get(
      path,
      { formatting: format ? "true" : undefined, key, type },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return (await res.json()) as Promise<JsonObject>;
  }

  /**
   * Send a Yjs binary update to the room’s Yjs document. You can use this endpoint to initialize Yjs data for the room or to update the room’s Yjs document.
   * @param roomId The id of the room to send the Yjs binary update to.
   * @param update The Yjs update to send. Typically the result of calling `Yjs.encodeStateAsUpdate(doc)`. Read the [Yjs documentation](https://docs.yjs.dev/api/document-updates) to learn how to create a binary update.
   * @param params.guid (optional) If provided, the binary update will be applied to the Yjs subdocument with the given guid. If not provided, the binary update will be applied to the root Yjs document.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async sendYjsBinaryUpdate(
    roomId: string,
    update: Uint8Array,
    params: { guid?: string } = {},
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#putBinary(
      url`/v2/rooms/${roomId}/ydoc`,
      update,
      { guid: params.guid },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Returns the room’s Yjs document encoded as a single binary update. This can be used by Y.applyUpdate(responseBody) to get a copy of the document in your backend.
   * See [Yjs documentation](https://docs.yjs.dev/api/document-updates) for more information on working with updates.
   * @param roomId The id of the room to get the Yjs document from.
   * @param params.guid (optional) If provided, returns the binary update of the Yjs subdocument with the given guid. If not provided, returns the binary update of the root Yjs document.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The room’s Yjs document encoded as a single binary update.
   */
  public async getYjsDocumentAsBinaryUpdate(
    roomId: string,
    params: { guid?: string } = {},
    options?: RequestOptions
  ): Promise<ArrayBuffer> {
    const res = await this.#get(
      url`/v2/rooms/${roomId}/ydoc-binary`,
      { guid: params.guid },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return res.arrayBuffer();
  }

  /* -------------------------------------------------------------------------------------------------
   * Schema Validation
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Creates a new schema which can be referenced later to enforce a room’s Storage data structure.
   * @param name The name used to reference the schema. Must be a non-empty string with less than 65 characters and only contain lowercase letters, numbers and dashes
   * @param body The exact allowed shape of data in the room. It is a multi-line string written in the [Liveblocks schema syntax](https://liveblocks.io/docs/platform/schema-validation/syntax).
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The created schema.
   */
  public async createSchema(
    name: string,
    body: string,
    options?: RequestOptions
  ): Promise<Schema> {
    const res = await this.#post(url`/v2/schemas`, { name, body }, options);
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    const data = (await res.json()) as SchemaPlain;

    // Convert createdAt and updatedAt from ISO date strings to Date objects
    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);
    return {
      ...data,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Returns a schema by its id.
   * @param schemaId Id of the schema - this is the combination of the schema name and version of the schema to update. For example, `my-schema@1`.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The schema with the given id.
   */
  public async getSchema(
    schemaId: string,
    options?: RequestOptions
  ): Promise<Schema> {
    const res = await this.#get(
      url`/v2/schemas/${schemaId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    const data = (await res.json()) as SchemaPlain;

    // Convert createdAt and updatedAt from ISO date strings to Date objects
    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);

    return {
      ...data,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Updates the body for the schema. A schema can only be updated if it is not used by any room.
   * @param schemaId Id of the schema - this is the combination of the schema name and version of the schema to update. For example, `my-schema@1`.
   * @param body The exact allowed shape of data in the room. It is a multi-line string written in the [Liveblocks schema syntax](https://liveblocks.io/docs/platform/schema-validation/syntax).
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The updated schema. The version of the schema will be incremented.
   */
  public async updateSchema(
    schemaId: string,
    body: string,
    options?: RequestOptions
  ): Promise<Schema> {
    const res = await this.#put(
      url`/v2/schemas/${schemaId}`,
      { body },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as SchemaPlain;

    // Convert createdAt and updatedAt from ISO date strings to Date objects
    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);

    return {
      ...data,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Deletes a schema by its id. A schema can only be deleted if it is not used by any room.
   * @param schemaId Id of the schema - this is the combination of the schema name and version of the schema to update. For example, `my-schema@1`.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteSchema(
    schemaId: string,
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#delete(
      url`/v2/schemas/${schemaId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Returns the schema attached to a room.
   * @param roomId The id of the room to get the schema from.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns
   */
  public async getSchemaByRoomId(
    roomId: string,
    options?: RequestOptions
  ): Promise<Schema> {
    const res = await this.#get(
      url`/v2/rooms/${roomId}/schema`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as SchemaPlain;

    // Convert createdAt and updatedAt from ISO date strings to Date objects
    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);

    return {
      ...data,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Attaches a schema to a room, and instantly enables runtime schema validation for the room.
   * If the current contents of the room’s Storage do not match the schema, attaching will fail and the error message will give details on why the schema failed to attach.
   * @param roomId The id of the room to attach the schema to.
   * @param schemaId Id of the schema - this is the combination of the schema name and version of the schema to update. For example, `my-schema@1`.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The schema id as JSON.
   */
  public async attachSchemaToRoom(
    roomId: string,
    schemaId: string,
    options?: RequestOptions
  ): Promise<{ schema: string }> {
    const res = await this.#post(
      url`/v2/rooms/${roomId}/schema`,
      { schema: schemaId },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return (await res.json()) as Promise<{ schema: string }>;
  }

  /**
   * Detaches a schema from a room, and disables runtime schema validation for the room.
   * @param roomId The id of the room to detach the schema from.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async detachSchemaFromRoom(
    roomId: string,
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#delete(
      url`/v2/rooms/${roomId}/schema`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /* -------------------------------------------------------------------------------------------------
   * Comments
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Gets all the threads in a room.
   *
   * @param params.roomId The room ID to get the threads from.
   * @param params.query The query to filter threads by. It is based on our query language and can filter by metadata.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns A list of threads.
   */
  public async getThreads(
    params: {
      roomId: string;
      /**
       * The query to filter threads by. It is based on our query language.
       *
       * @example
       * ```
       * {
       *   query: "metadata['organization']^'liveblocks:' AND metadata['status']:'open' AND metadata['pinned']:false AND metadata['priority']:3 AND resolved:true"
       * }
       * ```
       * @example
       * ```
       * {
       *   query: {
       *     metadata: {
       *       status: "open",
       *       pinned: false,
       *       priority: 3,
       *       organization: {
       *         startsWith: "liveblocks:"
       *       }
       *     },
       *     resolved: true
       *   }
       * }
       * ```
       */
      query?:
        | string
        | {
            metadata?: Partial<QueryMetadata<M>>;
            resolved?: boolean;
          };
    },
    options?: RequestOptions
  ): Promise<{ data: ThreadData<M>[] }> {
    const { roomId } = params;

    let query: string | undefined;

    if (typeof params.query === "string") {
      query = params.query;
    } else if (typeof params.query === "object") {
      query = objectToQuery(params.query);
    }

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads`,
      { query },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    const { data } = (await res.json()) as { data: ThreadDataPlain<M>[] };
    return {
      data: data.map((thread) => convertToThreadData(thread)),
    };
  }

  /**
   * Gets a thread.
   *
   * @param params.roomId The room ID to get the thread from.
   * @param params.threadId The thread ID.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns A thread.
   */
  public async getThread(
    params: { roomId: string; threadId: string },
    options?: RequestOptions
  ): Promise<ThreadData<M>> {
    const { roomId, threadId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads/${threadId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * @deprecated Prefer using `getMentionsFromCommentBody` to extract mentions
   * from comments and threads, or `Liveblocks.getThreadSubscriptions` to get
   * the list of users who are subscribed to a thread.
   *
   * Gets a thread's participants.
   *
   * Participants are users who have commented on the thread
   * or users that have been mentioned in a comment.
   *
   * @param params.roomId The room ID to get the thread participants from.
   * @param params.threadId The thread ID to get the participants from.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns An object containing an array of participant IDs.
   */
  public async getThreadParticipants(
    params: { roomId: string; threadId: string },
    options?: RequestOptions
  ): Promise<ThreadParticipants> {
    const { roomId, threadId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads/${threadId}/participants`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return (await res.json()) as Promise<ThreadParticipants>;
  }

  /**
   * Gets a thread's subscriptions.
   *
   * @param params.roomId The room ID to get the thread subscriptions from.
   * @param params.threadId The thread ID to get the subscriptions from.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns An array of subscriptions.
   */
  public async getThreadSubscriptions(
    params: { roomId: string; threadId: string },
    options?: RequestOptions
  ): Promise<{ data: UserSubscriptionData[] }> {
    const { roomId, threadId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads/${threadId}/subscriptions`,
      undefined,
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const { data } = (await res.json()) as {
      data: UserSubscriptionDataPlain[];
    };

    return {
      data: data.map(convertToUserSubscriptionData),
    };
  }

  /**
   * Gets a thread's comment.
   *
   * @param params.roomId The room ID to get the comment from.
   * @param params.threadId The thread ID to get the comment from.
   * @param params.commentId The comment ID.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns A comment.
   */
  public async getComment(
    params: { roomId: string; threadId: string; commentId: string },
    options?: RequestOptions
  ): Promise<CommentData> {
    const { roomId, threadId, commentId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return convertToCommentData((await res.json()) as CommentDataPlain);
  }

  /**
   * Creates a comment.
   *
   * @param params.roomId The room ID to create the comment in.
   * @param params.threadId The thread ID to create the comment in.
   * @param params.data.userId The user ID of the user who is set to create the comment.
   * @param params.data.createdAt (optional) The date the comment is set to be created.
   * @param params.data.body The body of the comment.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The created comment.
   */
  public async createComment(
    params: {
      roomId: string;
      threadId: string;
      data: { userId: string; createdAt?: Date; body: CommentBody };
    },
    options?: RequestOptions
  ): Promise<CommentData> {
    const { roomId, threadId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments`,
      {
        ...data,
        createdAt: data.createdAt?.toISOString(),
      },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
    return convertToCommentData((await res.json()) as CommentDataPlain);
  }

  /**
   * Edits a comment.
   * @param params.roomId The room ID to edit the comment in.
   * @param params.threadId The thread ID to edit the comment in.
   * @param params.commentId The comment ID to edit.
   * @param params.data.body The body of the comment.
   * @param params.data.editedAt (optional) The date the comment was edited.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The edited comment.
   */
  public async editComment(
    params: {
      roomId: string;
      threadId: string;
      commentId: string;
      data: { body: CommentBody; editedAt?: Date };
    },
    options?: RequestOptions
  ): Promise<CommentData> {
    const { roomId, threadId, commentId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}`,
      { ...data, editedAt: data.editedAt?.toISOString() },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return convertToCommentData((await res.json()) as CommentDataPlain);
  }

  /**
   * Deletes a comment. Deletes a comment. If there are no remaining comments in the thread, the thread is also deleted.
   * @param params.roomId The room ID to delete the comment in.
   * @param params.threadId The thread ID to delete the comment in.
   * @param params.commentId The comment ID to delete.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteComment(
    params: { roomId: string; threadId: string; commentId: string },
    options?: RequestOptions
  ): Promise<void> {
    const { roomId, threadId, commentId } = params;

    const res = await this.#delete(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Creates a new thread. The thread will be created with the specified comment as its first comment.
   * If the thread already exists, a `LiveblocksError` will be thrown with status code 409.
   * @param params.roomId The room ID to create the thread in.
   * @param params.thread.metadata (optional) The metadata for the thread. Supports upto a maximum of 10 entries. Value must be a string, boolean or number
   * @param params.thread.comment.userId The user ID of the user who created the comment.
   * @param params.thread.comment.createdAt (optional) The date the comment was created.
   * @param params.thread.comment.body The body of the comment.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The created thread. The thread will be created with the specified comment as its first comment.
   */
  public async createThread(
    params: CreateThreadOptions<M>,
    options?: RequestOptions
  ): Promise<ThreadData<M>> {
    const { roomId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads`,
      {
        ...data,
        comment: {
          ...data.comment,
          createdAt: data.comment.createdAt?.toISOString(),
        },
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Deletes a thread and all of its comments.
   * @param params.roomId The room ID to delete the thread in.
   * @param params.threadId The thread ID to delete.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteThread(
    params: { roomId: string; threadId: string },
    options?: RequestOptions
  ): Promise<void> {
    const { roomId, threadId } = params;

    const res = await this.#delete(
      url`/v2/rooms/${roomId}/threads/${threadId}`,
      undefined,
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Mark a thread as resolved.
   * @param params.roomId The room ID of the thread.
   * @param params.threadId The thread ID to mark as resolved.
   * @param params.data.userId The user ID of the user who marked the thread as resolved.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The thread marked as resolved.
   */
  public async markThreadAsResolved(
    params: { roomId: string; threadId: string; data: { userId: string } },
    options?: RequestOptions
  ): Promise<ThreadData<M>> {
    const { roomId, threadId } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/mark-as-resolved`,
      { userId: params.data.userId },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Mark a thread as unresolved.
   * @param params.roomId The room ID of the thread.
   * @param params.threadId The thread ID to mark as unresolved.
   * @param params.data.userId The user ID of the user who marked the thread as unresolved.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The thread marked as unresolved.
   */
  public async markThreadAsUnresolved(
    params: { roomId: string; threadId: string; data: { userId: string } },
    options?: RequestOptions
  ): Promise<ThreadData<M>> {
    const { roomId, threadId } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/mark-as-unresolved`,
      { userId: params.data.userId },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Subscribes a user to a thread.
   * @param params.roomId The room ID of the thread.
   * @param params.threadId The thread ID to subscribe to.
   * @param params.data.userId The user ID of the user to subscribe to the thread.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The thread subscription.
   */
  public async subscribeToThread(
    params: { roomId: string; threadId: string; data: { userId: string } },
    options?: RequestOptions
  ): Promise<SubscriptionData> {
    const { roomId, threadId } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/subscribe`,
      { userId: params.data.userId },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return convertToSubscriptionData(
      (await res.json()) as SubscriptionDataPlain
    );
  }

  /**
   * Unsubscribes a user from a thread.
   * @param params.roomId The room ID of the thread.
   * @param params.threadId The thread ID to unsubscribe from.
   * @param params.data.userId The user ID of the user to unsubscribe from the thread.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async unsubscribeFromThread(
    params: { roomId: string; threadId: string; data: { userId: string } },
    options?: RequestOptions
  ): Promise<void> {
    const { roomId, threadId } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/unsubscribe`,
      { userId: params.data.userId },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Updates the metadata of the specified thread in a room.
   * @param params.roomId The room ID to update the thread in.
   * @param params.threadId The thread ID to update.
   * @param params.data.metadata The metadata for the thread. Value must be a string, boolean or number
   * @param params.data.userId The user ID of the user who updated the thread.
   * @param params.data.updatedAt (optional) The date the thread is set to be updated.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The updated thread metadata.
   */
  public async editThreadMetadata(
    params: {
      roomId: string;
      threadId: string;
      data: { metadata: Patchable<M>; userId: string; updatedAt?: Date };
    },
    options?: RequestOptions
  ): Promise<M> {
    const { roomId, threadId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/metadata`,
      {
        ...data,
        updatedAt: data.updatedAt?.toISOString(),
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return (await res.json()) as M;
  }

  /**
   * Adds a new comment reaction to a comment.
   * @param params.roomId The room ID to add the comment reaction in.
   * @param params.threadId The thread ID to add the comment reaction in.
   * @param params.commentId The comment ID to add the reaction in.
   * @param params.data.emoji The (emoji) reaction to add.
   * @param params.data.userId The user ID of the user associated with the reaction.
   * @param params.data.createdAt (optional) The date the reaction is set to be created.
   * @param options.signal (optional) An abort signal to cancel the request.
   * @returns The created comment reaction.
   */
  public async addCommentReaction(
    params: {
      roomId: string;
      threadId: string;
      commentId: string;
      data: { emoji: string; userId: string; createdAt?: Date };
    },
    options?: RequestOptions
  ): Promise<CommentUserReaction> {
    const { roomId, threadId, commentId, data } = params;
    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}/add-reaction`,
      {
        ...data,
        createdAt: data.createdAt?.toISOString(),
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const reaction = (await res.json()) as CommentUserReactionPlain;
    return convertToCommentUserReaction(reaction);
  }

  /**
   * Removes a reaction from a comment.
   * @param params.roomId The room ID to remove the comment reaction from.
   * @param params.threadId The thread ID to remove the comment reaction from.
   * @param params.commentId The comment ID to remove the reaction from.
   * @param params.data.emoji The (emoji) reaction to remove.
   * @param params.data.userId The user ID of the user associated with the reaction.
   * @param params.data.removedAt (optional) The date the reaction is set to be removed.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async removeCommentReaction(
    params: {
      roomId: string;
      threadId: string;
      commentId: string;
      data: {
        emoji: string;
        userId: string;
        removedAt?: Date;
      };
    },
    options?: RequestOptions
  ): Promise<void> {
    const { roomId, threadId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${params.commentId}/remove-reaction`,
      {
        ...data,
        removedAt: data.removedAt?.toISOString(),
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Returns the inbox notifications for a user.
   * @param params.userId The user ID to get the inbox notifications from.
   * @param params.inboxNotificationId The ID of the inbox notification to get.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getInboxNotification(
    params: {
      userId: string;
      inboxNotificationId: string;
    },
    options?: RequestOptions
  ): Promise<InboxNotificationData> {
    const { userId, inboxNotificationId } = params;

    const res = await this.#get(
      url`/v2/users/${userId}/inbox-notifications/${inboxNotificationId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return convertToInboxNotificationData(
      (await res.json()) as InboxNotificationDataPlain
    );
  }

  /**
   * Returns the inbox notifications for a user.
   * @param params.userId The user ID to get the inbox notifications from.
   * @param params.query The query to filter inbox notifications by. It is based on our query language and can filter by unread.
   * @param params.tenantId (optional) The tenant ID to get the inbox notifications for.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getInboxNotifications(
    params: GetInboxNotificationsOptions,
    options?: RequestOptions
  ): Promise<Page<InboxNotificationData>> {
    const { userId, tenantId, limit, startingAfter } = params;

    let query: string | undefined;

    if (typeof params.query === "string") {
      query = params.query;
    } else if (typeof params.query === "object") {
      query = objectToQuery(params.query);
    }

    const res = await this.#get(
      url`/v2/users/${userId}/inbox-notifications`,
      {
        query,
        limit,
        startingAfter,
        tenantId,
      },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const page = (await res.json()) as Page<InboxNotificationDataPlain>;
    return {
      ...page,
      data: page.data.map(convertToInboxNotificationData),
    };
  }

  /**
   * Iterates over all inbox notifications for a user.
   *
   * The difference with .getInboxNotifications() is that pagination will
   * happen automatically under the hood, using the given `pageSize`.
   *
   * @param criteria.userId The user ID to get the inbox notifications from.
   * @param criteria.query The query to filter inbox notifications by. It is based on our query language and can filter by unread.
   * @param criteria.tenantId (optional) The tenant ID to get the inbox notifications for.
   * @param options.pageSize (optional) The page size to use for each request.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  async *iterInboxNotifications(
    criteria: InboxNotificationsQueryCriteria,
    options?: RequestOptions & { pageSize?: number }
  ): AsyncGenerator<InboxNotificationData> {
    // TODO Dry up this async iterable implementation for pagination
    const { signal } = options ?? {};
    const pageSize = checkBounds("pageSize", options?.pageSize ?? 50, 10);

    let cursor: string | undefined = undefined;
    while (true) {
      const { nextCursor, data } = await this.getInboxNotifications(
        { ...criteria, startingAfter: cursor, limit: pageSize },
        { signal }
      );
      for (const item of data) {
        yield item;
      }
      if (!nextCursor) {
        break;
      }
      cursor = nextCursor;
    }
  }

  /**
   * Returns all room subscription settings for a user.
   * @param params.userId The user ID to get the room subscription settings from.
   * @param params.tenantId (optional) The tenant ID to get the room subscription settings for.
   * @param params.startingAfter (optional) The cursor to start the pagination from.
   * @param params.limit (optional) The number of items to return.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getUserRoomSubscriptionSettings(
    params: { userId: string; tenantId?: string } & PaginationOptions,
    options?: RequestOptions
  ): Promise<Page<UserRoomSubscriptionSettings>> {
    const { userId, tenantId, startingAfter, limit } = params;

    const res = await this.#get(
      url`/v2/users/${userId}/room-subscription-settings`,
      {
        tenantId,
        startingAfter,
        limit,
      },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return (await res.json()) as Page<UserRoomSubscriptionSettings>;
  }

  /**
   * Gets the user's room subscription settings.
   * @param params.userId The user ID to get the room subscription settings from.
   * @param params.roomId The room ID to get the room subscription settings from.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getRoomSubscriptionSettings(
    params: {
      userId: string;
      roomId: string;
    },
    options?: RequestOptions
  ): Promise<RoomSubscriptionSettings> {
    const { userId, roomId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/users/${userId}/subscription-settings`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return (await res.json()) as RoomSubscriptionSettings;
  }

  /**
   * Updates the user's room subscription settings.
   * @param params.userId The user ID to update the room subscription settings for.
   * @param params.roomId The room ID to update the room subscription settings for.
   * @param params.data The new room subscription settings for the user.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async updateRoomSubscriptionSettings(
    params: {
      userId: string;
      roomId: string;
      data: Partial<RoomSubscriptionSettings>;
    },
    options?: RequestOptions
  ): Promise<RoomSubscriptionSettings> {
    const { userId, roomId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/users/${userId}/subscription-settings`,
      data,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    return (await res.json()) as RoomSubscriptionSettings;
  }

  /**
   * Delete the user's room subscription settings.
   * @param params.userId The user ID to delete the room subscription settings from.
   * @param params.roomId The room ID to delete the room subscription settings from.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteRoomSubscriptionSettings(
    params: {
      userId: string;
      roomId: string;
    },
    options?: RequestOptions
  ): Promise<void> {
    const { userId, roomId } = params;

    const res = await this.#delete(
      url`/v2/rooms/${roomId}/users/${userId}/subscription-settings`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Update a room ID.
   * @param params.roomId The current ID of the room.
   * @param params.newRoomId The new room ID.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async updateRoomId(
    params: {
      currentRoomId: string;
      newRoomId: string;
    },
    options?: RequestOptions
  ): Promise<RoomData> {
    const { currentRoomId, newRoomId } = params;

    const res = await this.#post(
      url`/v2/rooms/${currentRoomId}/update-room-id`,
      { newRoomId },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const data = (await res.json()) as RoomDataPlain;
    return inflateRoomData(data);
  }

  /**
   * Triggers an inbox notification for a user.
   * @param params.userId The user ID to trigger the inbox notification for.
   * @param params.kind The kind of inbox notification to trigger.
   * @param params.subjectId The subject ID of the triggered inbox notification.
   * @param params.activityData The activity data of the triggered inbox notification.
   * @param params.roomId (optional) The room ID to trigger the inbox notification for.
   * @param params.tenantId (optional) The tenant ID to trigger the inbox notification for.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async triggerInboxNotification<K extends KDAD>(
    params: {
      userId: string;
      kind: K;
      roomId?: string;
      tenantId?: string;
      subjectId: string;
      activityData: DAD[K];
    },
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#post(
      url`/v2/inbox-notifications/trigger`,
      params,
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Deletes an inbox notification for a user.
   * @param params.userId The user ID for which to delete the inbox notification.
   * @param params.inboxNotificationId The ID of the inbox notification to delete.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteInboxNotification(
    params: {
      userId: string;
      inboxNotificationId: string;
    },
    options?: RequestOptions
  ): Promise<void> {
    const { userId, inboxNotificationId } = params;

    const res = await this.#delete(
      url`/v2/users/${userId}/inbox-notifications/${inboxNotificationId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Deletes all inbox notifications for a user.
   * @param params.userId The user ID for which to delete all the inbox notifications.
   * @param params.tenantId (optional) The tenant ID to delete the inbox notifications for.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteAllInboxNotifications(
    params: { userId: string; tenantId?: string },
    options?: RequestOptions
  ): Promise<void> {
    const { userId, tenantId } = params;

    const res = await this.#delete(
      url`/v2/users/${userId}/inbox-notifications`,
      { tenantId },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Get notification settings for a user for a project.
   * @param params.userId The user ID to get the notifications settings for.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getNotificationSettings(
    params: { userId: string },
    options?: RequestOptions
  ): Promise<NotificationSettings> {
    const { userId } = params;

    const res = await this.#get(
      url`/v2/users/${userId}/notification-settings`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const plainSettings = (await res.json()) as NotificationSettingsPlain;
    const settings = createNotificationSettings(plainSettings);

    return settings;
  }

  /**
   * Update the user's notification settings.
   * @param params.userId The user ID to update the notification settings for.
   * @param params.data The new notification settings for the user.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async updateNotificationSettings(
    params: { userId: string; data: PartialNotificationSettings },
    options?: RequestOptions
  ): Promise<NotificationSettings> {
    const { userId, data } = params;

    const res = await this.#post(
      url`/v2/users/${userId}/notification-settings`,
      data,
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const plainSettings = (await res.json()) as NotificationSettingsPlain;
    const settings = createNotificationSettings(plainSettings);

    return settings;
  }

  /**
   * Delete the user's notification settings
   * @param params.userId The user ID to update the notification settings for.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteNotificationSettings(
    params: { userId: string },
    options?: RequestOptions
  ): Promise<void> {
    const { userId } = params;
    const res = await this.#delete(
      url`/v2/users/${userId}/notification-settings`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Create a group
   * @param params.groupId The ID of the group to create.
   * @param params.memberIds The IDs of the members to add to the group.
   * @param params.tenantId (optional) The tenant ID to create the group for.
   * @param params.scopes (optional) The scopes to grant to the group. The default
   * is `{ mention: true }`.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async createGroup(
    params: {
      groupId: string;
      memberIds?: string[];
      tenantId?: string;
      scopes?: { mention: true };
    },
    options?: RequestOptions
  ): Promise<GroupData> {
    const res = await this.#post(
      url`/v2/groups`,
      {
        ...params,

        // The REST API uses `id` since a group is a resource,
        // but we use `groupId` here for consistency with the other methods.
        id: params.groupId,
      },
      options
    );

    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const group = (await res.json()) as GroupDataPlain;
    return convertToGroupData(group);
  }

  /**
   * Get a group
   * @param params.groupId The ID of the group to get.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getGroup(
    params: { groupId: string },
    options?: RequestOptions
  ): Promise<GroupData> {
    const res = await this.#get(
      url`/v2/groups/${params.groupId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const group = (await res.json()) as GroupDataPlain;
    return convertToGroupData(group);
  }

  /**
   * Add members to a group
   * @param params.groupId The ID of the group to add members to.
   * @param params.memberIds The IDs of the members to add to the group.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async addGroupMembers(
    params: { groupId: string; memberIds: string[] },
    options?: RequestOptions
  ): Promise<GroupData> {
    const res = await this.#post(
      url`/v2/groups/${params.groupId}/add-members`,
      { memberIds: params.memberIds },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const group = (await res.json()) as GroupDataPlain;
    return convertToGroupData(group);
  }

  /**
   * Remove members from a group
   * @param params.groupId The ID of the group to remove members from.
   * @param params.memberIds The IDs of the members to remove from the group.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async removeGroupMembers(
    params: { groupId: string; memberIds: string[] },
    options?: RequestOptions
  ): Promise<GroupData> {
    const res = await this.#post(
      url`/v2/groups/${params.groupId}/remove-members`,
      { memberIds: params.memberIds },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const group = (await res.json()) as GroupDataPlain;
    return convertToGroupData(group);
  }

  /**
   * Delete a group
   * @param params.groupId The ID of the group to delete.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async deleteGroup(
    params: { groupId: string },
    options?: RequestOptions
  ): Promise<void> {
    const res = await this.#delete(
      url`/v2/groups/${params.groupId}`,
      undefined,
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }
  }

  /**
   * Get all groups
   * @param params.limit (optional) The number of groups to return.
   * @param params.startingAfter (optional) The cursor to start the pagination from.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getGroups(
    params?: PaginationOptions,
    options?: RequestOptions
  ): Promise<Page<GroupData>> {
    const res = await this.#get(
      url`/v2/groups`,
      { startingAfter: params?.startingAfter, limit: params?.limit },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const page = (await res.json()) as Page<GroupDataPlain>;
    return {
      ...page,
      data: page.data.map(convertToGroupData),
    };
  }

  /**
   * Returns all groups a user is a member of.
   * @param params.userId The user ID to get the groups for.
   * @param params.startingAfter (optional) The cursor to start the pagination from.
   * @param params.limit (optional) The number of items to return.
   * @param options.signal (optional) An abort signal to cancel the request.
   */
  public async getUserGroups(
    params: { userId: string } & PaginationOptions,
    options?: RequestOptions
  ): Promise<Page<GroupData>> {
    const { userId, startingAfter, limit } = params;

    const res = await this.#get(
      url`/v2/users/${userId}/groups`,
      { startingAfter, limit },
      options
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    const page = (await res.json()) as Page<GroupDataPlain>;

    return {
      ...page,
      data: page.data.map(convertToGroupData),
    };
  }

  /**
   * Retrieves the current Storage contents for the given room ID and calls the
   * provided callback function, in which you can mutate the Storage contents
   * at will.
   *
   * If you need to run the same mutation across multiple rooms, prefer using
   * `.massMutateStorage()` instead of looping over room IDs yourself.
   */
  public async mutateStorage(
    roomId: string,
    callback: MutateStorageCallback,
    options?: MutateStorageOptions
  ): Promise<void> {
    return this.#_mutateOneRoom(roomId, undefined, callback, options);
  }

  /**
   * Retrieves the Storage contents for each room that matches the given
   * criteria and calls the provided callback function, in which you can mutate
   * the Storage contents at will.
   *
   * You can use the `criteria` parameter to select which rooms to process by
   * their metadata. If you pass `{}` (empty object), all rooms will be
   * selected and processed.
   *
   * This method will execute mutations in parallel, using the specified
   * `concurrency` value. If you which to run the mutations serially, set
   * `concurrency` to 1.
   */
  public async massMutateStorage(
    criteria: RoomsQueryCriteria,
    callback: MassMutateStorageCallback,
    massOptions?: MassMutateStorageOptions
  ): Promise<void> {
    const concurrency = checkBounds(
      "concurrency",
      massOptions?.concurrency ?? 8,
      1,
      20
    );

    // Try to select a reasonable page size based on the concurrency level, but
    // at least never less than 20.
    const pageSize = Math.max(20, concurrency * 4);
    const { signal } = massOptions ?? {};
    const rooms = this.iterRooms(criteria, { pageSize, signal });

    const options = { signal };
    await runConcurrently(
      rooms,
      (roomData) =>
        this.#_mutateOneRoom(roomData.id, roomData, callback, options),
      concurrency
    );
  }

  async #_mutateOneRoom<RD extends RoomData | undefined>(
    roomId: string,
    room: RD,
    callback: (context: { room: RD; root: LiveObject<S> }) => Awaitable<void>,
    options?: MutateStorageOptions
  ): Promise<void> {
    // Hard-coded for now, see https://github.com/liveblocks/liveblocks/pull/2293#issuecomment-2740067249
    const debounceInterval = 200;

    // The plan:
    // 1. Create a new pool
    // 2. Download the storage contents
    // 3. Construct the Live tree
    // 4. Run the callback
    // 5. Capture all the changes to the pool
    // 6. Send the resulting ops to the server at a throttled interval

    const { signal, abort } = makeAbortController(options?.signal);

    // Set up a "debouncer": we'll flush the buffered ops to the server if
    // there hasn't been an update to the buffered ops for a while. This
    // behavior is slightly different from the browser client, which will emit
    // ops as soon as they are available (= throttling)
    let opsBuffer: Op[] = [];
    let outstandingFlush$: Promise<void> | undefined = undefined;
    let lastFlush = performance.now();

    const flushIfNeeded = (force: boolean) => {
      if (opsBuffer.length === 0)
        // Nothing to do
        return;

      if (outstandingFlush$) {
        // There already is an outstanding flush, wait for it to complete
        return;
      }

      const now = performance.now();
      if (!(force || now - lastFlush > debounceInterval)) {
        // We're still within the debounce window, do nothing right now
        return;
      }

      // All good, flush right now
      lastFlush = now;
      const ops = opsBuffer;
      opsBuffer = [];

      outstandingFlush$ = this.#sendMessage(
        roomId,
        [{ type: ClientMsgCode.UPDATE_STORAGE, ops }],
        { signal }
      )
        .catch((err) => {
          // For now, if any error happens during one of the flushes, abort the entire thing
          // TODO Think about more error handling control options here later (auto-retry, etc)
          abort(err);
        })
        .finally(() => {
          outstandingFlush$ = undefined;
        });
    };

    // Download the storage contents
    try {
      const resp = await this.#requestStorageMutation(roomId, { signal });
      const { actor, nodes } = resp;

      // Create a new pool
      const pool = createManagedPool(roomId, {
        getCurrentConnectionId: () => actor,
        onDispatch: (
          ops: Op[],
          _reverse: Op[],
          _storageUpdates: Map<string, StorageUpdate>
        ) => {
          if (ops.length === 0) return;

          // Capture all the changes to the pool
          for (const op of ops) {
            opsBuffer.push(op);
          }
          flushIfNeeded(/* force */ false);
        },
      });

      // Construct the Live tree
      const root = LiveObject._fromItems<S>(nodes, pool);

      // Run the callback
      const callback$ = callback({ room, root });

      // If the callback synchronously makes changes, we'll want to flush those as soon as possible, then flush on an interval for the remainder of the async callback.
      flushIfNeeded(/* force */ true);

      await callback$;
    } catch (e) {
      abort();
      throw e;
    } finally {
      // Await any outstanding flushes, and then flush one last time
      await outstandingFlush$; // eslint-disable-line @typescript-eslint/await-thenable
      flushIfNeeded(/* force */ true);
      await outstandingFlush$; // eslint-disable-line @typescript-eslint/await-thenable
    }
  }

  async #sendMessage(
    roomId: string,
    messages: ClientMsg<JsonObject, Json>[],
    options?: RequestOptions
  ) {
    const res = await this.#post(
      url`/v2/rooms/${roomId}/send-message`,
      { messages },
      { signal: options?.signal }
    );
    if (!res.ok) {
      throw await LiveblocksError.from(res);
    }

    // TODO: If res.ok, it will be a 200 response containing all returned Ops.
    // These may include fix ops, which should get applied back to the managed
    // pool.
    // TODO Implement the handling of fix-ops:
    // const data = (await res.json()) as {
    //   messages: readonly (
    //     | ServerMsg<JsonObject, BaseUserMeta, Json>
    //     | readonly ServerMsg<JsonObject, BaseUserMeta, Json>[]
    //   )[];
    // };
    // return data;
  }
}

export class LiveblocksError extends Error {
  readonly status: number;
  readonly details?: string;

  private constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "LiveblocksError";
    this.status = status;
    this.details = details;
  }

  public toString(): string {
    let msg = `${this.name}: ${this.message} (status ${this.status})`;
    if (this.details) {
      msg += `\n${this.details}`;
    }
    return msg;
  }

  static async from(res: Response): Promise<LiveblocksError> {
    // Retain the stack trace of the original error location, not the async return point
    const origErrLocation = new Error();
    Error.captureStackTrace(origErrLocation, LiveblocksError.from); // eslint-disable-line

    const FALLBACK = "An error happened without an error message";
    let text: string;
    try {
      text = await res.text();
    } catch {
      text = FALLBACK;
    }
    const obj = (tryParseJson(text) ?? { message: text }) as JsonObject;

    const message = (obj.message || FALLBACK) as string;
    const details =
      [
        obj.suggestion ? `Suggestion: ${String(obj.suggestion)}` : undefined,
        obj.docs ? `See also: ${String(obj.docs)}` : undefined,
      ]
        .filter(Boolean)
        .join("\n") || undefined;

    const err = new LiveblocksError(message, res.status, details);
    err.stack = origErrLocation.stack;
    return err;
  }
}
