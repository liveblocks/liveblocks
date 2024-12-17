/**
 * NOTE: only types should be imported from @liveblocks/core.
 * This is because this package is made to be used in Node.js, and
 * @liveblocks/core has browser-specific code.
 */
import type {
  BaseMetadata,
  BaseUserMeta,
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
  InboxNotificationData,
  InboxNotificationDataPlain,
  Json,
  JsonObject,
  KDAD,
  LsonObject,
  OptionalTupleUnless,
  PartialUnless,
  Patchable,
  PlainLsonObject,
  QueryMetadata,
  QueryParams,
  RoomNotificationSettings,
  ThreadData,
  ThreadDataPlain,
  ToImmutable,
  URLSafeString,
} from "@liveblocks/core";
import {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToInboxNotificationData,
  convertToThreadData,
  objectToQuery,
  url,
  urljoin,
} from "@liveblocks/core";

import { Session } from "./Session";
import {
  assertNonEmpty,
  assertSecretKey,
  fetchPolyfill,
  getBaseUrl,
  normalizeStatusCode,
} from "./utils";

type ToSimplifiedJson<S extends LsonObject> = LsonObject extends S
  ? JsonObject
  : ToImmutable<S>;

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
  PartialUnless<U["info"], { userInfo: U["info"] }>;

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

  async #post(path: URLSafeString, json: Json): Promise<Response> {
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
    });
    return res;
  }

  async #put(path: URLSafeString, json: Json): Promise<Response> {
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
    });
  }

  async #putBinary(
    path: URLSafeString,
    body: Uint8Array,
    params?: QueryParams
  ): Promise<Response> {
    const url = urljoin(this.#baseUrl, path, params);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
      "Content-Type": "application/octet-stream",
    };
    const fetch = await fetchPolyfill();
    return await fetch(url, { method: "PUT", headers, body });
  }

  async #delete(path: URLSafeString): Promise<Response> {
    const url = urljoin(this.#baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
    };
    const fetch = await fetchPolyfill();
    const res = await fetch(url, { method: "DELETE", headers });
    return res;
  }

  async #get(path: URLSafeString, params?: QueryParams): Promise<Response> {
    const url = urljoin(this.#baseUrl, path, params);
    const headers = {
      Authorization: `Bearer ${this.#secret}`,
    };
    const fetch = await fetchPolyfill();
    const res = await fetch(url, { method: "GET", headers });
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
    return new Session(this.#post.bind(this), userId, options?.userInfo);
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
    const userId = typeof identity === "string" ? identity : identity.userId;
    const groupIds =
      typeof identity === "string" ? undefined : identity.groupIds;

    assertNonEmpty(userId, "userId"); // TODO: Check if this is a legal userId value too
    // assertStringArrayOrUndefined(groupsIds, "groupIds"); // TODO: Check if this is a legal userId value too

    try {
      const resp = await this.#post(path, {
        userId,
        groupIds,

        // Optional metadata
        userInfo: options?.userInfo,
      });

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
   * @param params.query (optional) A query to filter rooms by. It is based on our query language. You can filter by metadata and room ID.
   * @returns A list of rooms.
   */
  public async getRooms(
    params: {
      limit?: number;
      startingAfter?: string;
      /**
       * @deprecated Use `query` property instead. Support for the `metadata`
       * field will be removed in a future version.
       */
      metadata?: QueryRoomMetadata;
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
    } = {}
  ): Promise<{
    nextPage: string | null;
    nextCursor: string | null;
    data: RoomData[];
  }> {
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
      // "Flatten" {metadata: {foo: "bar"}} to {"metadata.foo": "bar"}
      ...Object.fromEntries(
        Object.entries(params.metadata ?? {}).map(([key, val]) => [
          `metadata.${key}`,
          val,
        ])
      ),
      query,
    };

    const res = await this.#get(path, queryParams);

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    const data = (await res.json()) as {
      nextPage: string | null;
      nextCursor: string | null;
      data: RoomDataPlain[];
    };

    const rooms = data.data.map((room) => {
      // Convert lastConnectionAt and createdAt from ISO date strings to Date objects
      const lastConnectionAt = room.lastConnectionAt
        ? new Date(room.lastConnectionAt)
        : undefined;

      const createdAt = new Date(room.createdAt);
      return {
        ...room,
        createdAt,
        lastConnectionAt,
      };
    });

    return {
      ...data,
      data: rooms,
    };
  }

  /**
   * Creates a new room with the given id.
   * @param roomId The id of the room to create.
   * @param params.defaultAccesses The default accesses for the room.
   * @param params.groupsAccesses (optional) The group accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.usersAccesses (optional) The user accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @returns The created room.
   */
  public async createRoom(
    roomId: string,
    params: {
      defaultAccesses: RoomPermission;
      groupsAccesses?: RoomAccesses;
      usersAccesses?: RoomAccesses;
      metadata?: RoomMetadata;
    }
  ): Promise<RoomData> {
    const { defaultAccesses, groupsAccesses, usersAccesses, metadata } = params;

    const res = await this.#post(url`/v2/rooms`, {
      id: roomId,
      defaultAccesses,
      groupsAccesses,
      usersAccesses,
      metadata,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    const data = (await res.json()) as RoomDataPlain;

    // Convert lastConnectionAt and createdAt from ISO date strings to Date objects
    const lastConnectionAt = data.lastConnectionAt
      ? new Date(data.lastConnectionAt)
      : undefined;

    const createdAt = new Date(data.createdAt);
    return {
      ...data,
      lastConnectionAt,
      createdAt,
    };
  }

  /**
   * Returns a room with the given id.
   * @param roomId The id of the room to return.
   * @returns The room with the given id.
   */
  public async getRoom(roomId: string): Promise<RoomData> {
    const res = await this.#get(url`/v2/rooms/${roomId}`);

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    const data = (await res.json()) as RoomDataPlain;

    // Convert lastConnectionAt and createdAt from ISO date strings to Date objects
    const lastConnectionAt = data.lastConnectionAt
      ? new Date(data.lastConnectionAt)
      : undefined;

    const createdAt = new Date(data.createdAt);
    return {
      ...data,
      createdAt,
      lastConnectionAt,
    };
  }

  /**
   * Updates specific properties of a room. It’s not necessary to provide the entire room’s information.
   * Setting a property to `null` means to delete this property.
   * @param roomId The id of the room to update.
   * @param params.defaultAccesses (optional) The default accesses for the room.
   * @param params.groupsAccesses (optional) The group accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.usersAccesses (optional) The user accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @returns The updated room.
   */
  public async updateRoom(
    roomId: string,
    params: {
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
    }
  ): Promise<RoomData> {
    const { defaultAccesses, groupsAccesses, usersAccesses, metadata } = params;

    const res = await this.#post(url`/v2/rooms/${roomId}`, {
      defaultAccesses,
      groupsAccesses,
      usersAccesses,
      metadata,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    const data = (await res.json()) as RoomDataPlain;

    // Convert lastConnectionAt and createdAt from ISO date strings to Date objects
    const lastConnectionAt = data.lastConnectionAt
      ? new Date(data.lastConnectionAt)
      : undefined;

    const createdAt = new Date(data.createdAt);
    return {
      ...data,
      lastConnectionAt,
      createdAt,
    };
  }

  /**
   * Deletes a room with the given id. A deleted room is no longer accessible from the API or the dashboard and it cannot be restored.
   * @param roomId The id of the room to delete.
   */
  public async deleteRoom(roomId: string): Promise<void> {
    const res = await this.#delete(url`/v2/rooms/${roomId}`);

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Returns a list of users currently present in the requested room. For better performance, we recommand to call this endpoint every 10 seconds maximum. Duplicates can happen if a user is in the requested room with multiple browser tabs opened.
   * @param roomId The id of the room to get the users from.
   * @returns A list of users currently present in the requested room.
   */
  public async getActiveUsers(
    roomId: string
  ): Promise<{ data: RoomUser<U>[] }> {
    const res = await this.#get(url`/v2/rooms/${roomId}/active_users`);

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return (await res.json()) as Promise<{ data: RoomUser<U>[] }>;
  }

  /**
   * Boadcasts an event to a room without having to connect to it via the client from @liveblocks/client. The connectionId passed to event listeners is -1 when using this API.
   * @param roomId The id of the room to broadcast the event to.
   * @param message The message to broadcast. It can be any JSON serializable value.
   */
  public async broadcastEvent(roomId: string, message: E): Promise<void> {
    const res = await this.#post(
      url`/v2/rooms/${roomId}/broadcast_event`,
      message
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * In that format, each LiveObject and LiveMap will be formatted as a simple JSON object, and each LiveList will be formatted as a simple JSON array. This is a lossy format because information about the original data structures is not retained, but it may be easier to work with.
   */
  public getStorageDocument(
    roomId: string,
    format: "plain-lson"
  ): Promise<PlainLsonObject>;

  public getStorageDocument(roomId: string): Promise<PlainLsonObject>; // Default to 'plain-lson' when no format is provided

  public getStorageDocument(
    roomId: string,
    format: "json"
  ): Promise<ToSimplifiedJson<S>>;

  public async getStorageDocument(
    roomId: string,
    format: "plain-lson" | "json" = "plain-lson"
  ): Promise<PlainLsonObject | ToSimplifiedJson<S>> {
    const res = await this.#get(url`/v2/rooms/${roomId}/storage`, { format });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
    return (await res.json()) as Promise<PlainLsonObject | ToSimplifiedJson<S>>;
  }

  /**
   * Initializes a room’s Storage. The room must already exist and have an empty Storage.
   * Calling this endpoint will disconnect all users from the room if there are any.
   *
   * @param roomId The id of the room to initialize the storage from.
   * @param document The document to initialize the storage with.
   * @returns The initialized storage document. It is of the same format as the one passed in.
   */
  public async initializeStorageDocument(
    roomId: string,
    document: PlainLsonObject
  ): Promise<PlainLsonObject> {
    const res = await this.#post(url`/v2/rooms/${roomId}/storage`, document);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
    return (await res.json()) as Promise<PlainLsonObject>;
  }

  /**
   * Deletes all of the room’s Storage data and disconnect all users from the room if there are any. Note that this does not delete the Yjs document in the room if one exists.
   * @param roomId The id of the room to delete the storage from.
   */
  public async deleteStorageDocument(roomId: string): Promise<void> {
    const res = await this.#delete(url`/v2/rooms/${roomId}/storage`);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns A JSON representation of the room’s Yjs document.
   */
  public async getYjsDocument(
    roomId: string,
    params: {
      format?: boolean;
      key?: string;
      type?: string;
    } = {}
  ): Promise<JsonObject> {
    const { format, key, type } = params;

    const path = url`v2/rooms/${roomId}/ydoc`;

    const res = await this.#get(path, {
      formatting: format ? "true" : undefined,
      key,
      type,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return (await res.json()) as Promise<JsonObject>;
  }

  /**
   * Send a Yjs binary update to the room’s Yjs document. You can use this endpoint to initialize Yjs data for the room or to update the room’s Yjs document.
   * @param roomId The id of the room to send the Yjs binary update to.
   * @param update The Yjs update to send. Typically the result of calling `Yjs.encodeStateAsUpdate(doc)`. Read the [Yjs documentation](https://docs.yjs.dev/api/document-updates) to learn how to create a binary update.
   * @param params.guid (optional) If provided, the binary update will be applied to the Yjs subdocument with the given guid. If not provided, the binary update will be applied to the root Yjs document.
   */
  public async sendYjsBinaryUpdate(
    roomId: string,
    update: Uint8Array,
    params: {
      guid?: string;
    } = {}
  ): Promise<void> {
    const res = await this.#putBinary(url`/v2/rooms/${roomId}/ydoc`, update, {
      guid: params.guid,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Returns the room’s Yjs document encoded as a single binary update. This can be used by Y.applyUpdate(responseBody) to get a copy of the document in your backend.
   * See [Yjs documentation](https://docs.yjs.dev/api/document-updates) for more information on working with updates.
   * @param roomId The id of the room to get the Yjs document from.
   * @param params.guid (optional) If provided, returns the binary update of the Yjs subdocument with the given guid. If not provided, returns the binary update of the root Yjs document.
   * @returns The room’s Yjs document encoded as a single binary update.
   */
  public async getYjsDocumentAsBinaryUpdate(
    roomId: string,
    params: {
      guid?: string;
    } = {}
  ): Promise<ArrayBuffer> {
    const res = await this.#get(url`/v2/rooms/${roomId}/ydoc-binary`, {
      guid: params.guid,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The created schema.
   */
  public async createSchema(name: string, body: string): Promise<Schema> {
    const res = await this.#post(url`/v2/schemas`, {
      name,
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The schema with the given id.
   */
  public async getSchema(schemaId: string): Promise<Schema> {
    const res = await this.#get(url`/v2/schemas/${schemaId}`);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The updated schema. The version of the schema will be incremented.
   */
  public async updateSchema(schemaId: string, body: string): Promise<Schema> {
    const res = await this.#put(url`/v2/schemas/${schemaId}`, {
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   */
  public async deleteSchema(schemaId: string): Promise<void> {
    const res = await this.#delete(url`/v2/schemas/${schemaId}`);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Returns the schema attached to a room.
   * @param roomId The id of the room to get the schema from.
   * @returns
   */
  public async getSchemaByRoomId(roomId: string): Promise<Schema> {
    const res = await this.#get(url`/v2/rooms/${roomId}/schema`);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The schema id as JSON.
   */
  public async attachSchemaToRoom(
    roomId: string,
    schemaId: string
  ): Promise<{ schema: string }> {
    const res = await this.#post(url`/v2/rooms/${roomId}/schema`, {
      schema: schemaId,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
    return (await res.json()) as Promise<{ schema: string }>;
  }

  /**
   * Detaches a schema from a room, and disables runtime schema validation for the room.
   * @param roomId The id of the room to detach the schema from.
   */
  public async detachSchemaFromRoom(roomId: string): Promise<void> {
    const res = await this.#delete(url`/v2/rooms/${roomId}/schema`);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns A list of threads.
   */
  public async getThreads(params: {
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
  }): Promise<{ data: ThreadData<M>[] }> {
    const { roomId } = params;

    let query: string | undefined;

    if (typeof params.query === "string") {
      query = params.query;
    } else if (typeof params.query === "object") {
      query = objectToQuery(params.query);
    }

    const res = await this.#get(url`/v2/rooms/${roomId}/threads`, {
      query,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns A thread.
   */
  public async getThread(params: {
    roomId: string;
    threadId: string;
  }): Promise<ThreadData<M>> {
    const { roomId, threadId } = params;

    const res = await this.#get(url`/v2/rooms/${roomId}/threads/${threadId}`);
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Gets a thread's participants.
   *
   * Participants are users who have commented on the thread
   * or users and groups that have been mentioned in a comment.
   *
   * @param params.roomId The room ID to get the thread participants from.
   * @param params.threadId The thread ID to get the participants from.
   * @returns An object containing an array of participant IDs.
   */
  public async getThreadParticipants(params: {
    roomId: string;
    threadId: string;
  }): Promise<ThreadParticipants> {
    const { roomId, threadId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads/${threadId}/participants`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
    return (await res.json()) as Promise<ThreadParticipants>;
  }

  /**
   * Gets a thread's comment.
   *
   * @param params.roomId The room ID to get the comment from.
   * @param params.threadId The thread ID to get the comment from.
   * @param params.commentId The comment ID.
   * @returns A comment.
   */
  public async getComment(params: {
    roomId: string;
    threadId: string;
    commentId: string;
  }): Promise<CommentData> {
    const { roomId, threadId, commentId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The created comment.
   */
  public async createComment(params: {
    roomId: string;
    threadId: string;
    data: {
      userId: string;
      createdAt?: Date;
      body: CommentBody;
    };
  }): Promise<CommentData> {
    const { roomId, threadId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments`,
      {
        ...data,
        createdAt: data.createdAt?.toISOString(),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The edited comment.
   */
  public async editComment(params: {
    roomId: string;
    threadId: string;
    commentId: string;
    data: {
      body: CommentBody;
      editedAt?: Date;
    };
  }): Promise<CommentData> {
    const { roomId, threadId, commentId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}`,
      {
        ...data,
        editedAt: data.editedAt?.toISOString(),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return convertToCommentData((await res.json()) as CommentDataPlain);
  }

  /**
   * Deletes a comment. Deletes a comment. If there are no remaining comments in the thread, the thread is also deleted.
   * @param params.roomId The room ID to delete the comment in.
   * @param params.threadId The thread ID to delete the comment in.
   * @param params.commentId The comment ID to delete.
   */
  public async deleteComment(params: {
    roomId: string;
    threadId: string;
    commentId: string;
  }): Promise<void> {
    const { roomId, threadId, commentId } = params;

    const res = await this.#delete(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The created thread. The thread will be created with the specified comment as its first comment.
   */
  public async createThread(
    params: CreateThreadOptions<M>
  ): Promise<ThreadData<M>> {
    const { roomId, data } = params;

    const res = await this.#post(url`/v2/rooms/${roomId}/threads`, {
      ...data,
      comment: {
        ...data.comment,
        createdAt: data.comment.createdAt?.toISOString(),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Deletes a thread and all of its comments.
   * @param params.roomId The room ID to delete the thread in.
   * @param params.threadId The thread ID to delete.
   */
  public async deleteThread(params: {
    roomId: string;
    threadId: string;
  }): Promise<void> {
    const { roomId, threadId } = params;

    const res = await this.#delete(
      url`/v2/rooms/${roomId}/threads/${threadId}`
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Mark a thread as resolved.
   * @param params.roomId The room ID of the thread.
   * @param params.threadId The thread ID to mark as resolved.
   * @param params.data.userId The user ID of the user who marked the thread as resolved.
   * @returns The thread marked as resolved.
   */
  public async markThreadAsResolved(params: {
    roomId: string;
    threadId: string;
    data: {
      userId: string;
    };
  }): Promise<ThreadData<M>> {
    const { roomId, threadId } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/mark-as-resolved`,
      {}
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Mark a thread as unresolved.
   * @param params.roomId The room ID of the thread.
   * @param params.threadId The thread ID to mark as unresolved.
   * @param params.data.userId The user ID of the user who marked the thread as unresolved.
   * @returns The thread marked as unresolved.
   */
  public async markThreadAsUnresolved(params: {
    roomId: string;
    threadId: string;
    data: {
      userId: string;
    };
  }): Promise<ThreadData<M>> {
    const { roomId, threadId } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/mark-as-unresolved`,
      {}
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return convertToThreadData((await res.json()) as ThreadDataPlain<M>);
  }

  /**
   * Updates the metadata of the specified thread in a room.
   * @param params.roomId The room ID to update the thread in.
   * @param params.threadId The thread ID to update.
   * @param params.data.metadata The metadata for the thread. Value must be a string, boolean or number
   * @param params.data.userId The user ID of the user who updated the thread.
   * @param params.data.updatedAt (optional) The date the thread is set to be updated.
   * @returns The updated thread metadata.
   */
  public async editThreadMetadata(params: {
    roomId: string;
    threadId: string;
    data: {
      metadata: Patchable<M>;
      userId: string;
      updatedAt?: Date;
    };
  }): Promise<M> {
    const { roomId, threadId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/metadata`,
      {
        ...data,
        updatedAt: data.updatedAt?.toISOString(),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   * @returns The created comment reaction.
   */
  public async addCommentReaction(params: {
    roomId: string;
    threadId: string;
    commentId: string;
    data: {
      emoji: string;
      userId: string;
      createdAt?: Date;
    };
  }): Promise<CommentUserReaction> {
    const { roomId, threadId, commentId, data } = params;
    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${commentId}/add-reaction`,
      {
        ...data,
        createdAt: data.createdAt?.toISOString(),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
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
   */
  public async removeCommentReaction(params: {
    roomId: string;
    threadId: string;
    commentId: string;
    data: {
      emoji: string;
      userId: string;
      removedAt?: Date;
    };
  }): Promise<void> {
    const { roomId, threadId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/threads/${threadId}/comments/${params.commentId}/remove-reaction`,
      {
        ...data,
        removedAt: data.removedAt?.toISOString(),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Returns the inbox notifications for a user.
   * @param params.userId The user ID to get the inbox notifications from.
   * @param params.inboxNotificationId The ID of the inbox notification to get.
   */
  public async getInboxNotification(params: {
    userId: string;
    inboxNotificationId: string;
  }): Promise<InboxNotificationData> {
    const { userId, inboxNotificationId } = params;

    const res = await this.#get(
      url`/v2/users/${userId}/inbox-notifications/${inboxNotificationId}`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return convertToInboxNotificationData(
      (await res.json()) as InboxNotificationDataPlain
    );
  }

  /**
   * Returns the inbox notifications for a user.
   * @param params.userId The user ID to get the inbox notifications from.
   * @param params.query The query to filter inbox notifications by. It is based on our query language and can filter by unread.
   */
  public async getInboxNotifications(params: {
    userId: string;
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
  }): Promise<{ data: InboxNotificationData[] }> {
    const { userId } = params;

    let query: string | undefined;

    if (typeof params.query === "string") {
      query = params.query;
    } else if (typeof params.query === "object") {
      query = objectToQuery(params.query);
    }

    const res = await this.#get(url`/v2/users/${userId}/inbox-notifications`, {
      query,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    const { data } = (await res.json()) as {
      data: InboxNotificationDataPlain[];
    };

    return {
      data: data.map(convertToInboxNotificationData),
    };
  }

  /**
   * Gets the user's room notification settings.
   * @param params.userId The user ID to get the room notifications from.
   * @param params.roomId The room ID to get the room notification settings from.
   */
  public async getRoomNotificationSettings(params: {
    userId: string;
    roomId: string;
  }): Promise<RoomNotificationSettings> {
    const { userId, roomId } = params;

    const res = await this.#get(
      url`/v2/rooms/${roomId}/users/${userId}/notification-settings`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return (await res.json()) as RoomNotificationSettings;
  }

  /**
   * Updates the user's room notification settings.
   * @param params.userId The user ID to update the room notification settings for.
   * @param params.roomId The room ID to update the room notification settings for.
   * @param params.data The new room notification settings for the user.
   */
  public async updateRoomNotificationSettings(params: {
    userId: string;
    roomId: string;
    data: RoomNotificationSettings;
  }): Promise<RoomNotificationSettings> {
    const { userId, roomId, data } = params;

    const res = await this.#post(
      url`/v2/rooms/${roomId}/users/${userId}/notification-settings`,
      data
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }

    return (await res.json()) as RoomNotificationSettings;
  }

  /**
   * Delete the user's room notification settings.
   * @param params.userId The user ID to delete the room notification settings from.
   * @param params.roomId The room ID to delete the room notification settings from.
   */
  public async deleteRoomNotificationSettings(params: {
    userId: string;
    roomId: string;
  }): Promise<void> {
    const { userId, roomId } = params;

    const res = await this.#delete(
      url`/v2/rooms/${roomId}/users/${userId}/notification-settings`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Update a room ID.
   * @param params.roomId The current ID of the room.
   * @param params.newRoomId The new room ID.
   */
  public async updateRoomId(params: {
    currentRoomId: string;
    newRoomId: string;
  }): Promise<RoomData> {
    const { currentRoomId, newRoomId } = params;

    const res = await this.#post(
      url`/v2/rooms/${currentRoomId}/update-room-id`,
      {
        newRoomId,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
    const data = (await res.json()) as RoomDataPlain;
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      lastConnectionAt: data.lastConnectionAt
        ? new Date(data.lastConnectionAt)
        : undefined,
    };
  }

  public async triggerInboxNotification<K extends KDAD>(params: {
    userId: string;
    kind: K;
    roomId?: string;
    subjectId: string;
    activityData: DAD[K];
  }): Promise<void> {
    const res = await this.#post(url`/v2/inbox-notifications/trigger`, params);

    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Deletes an inbox notification for a user.
   * @param params.userId The user ID for which to delete the inbox notification.
   * @param params.inboxNotificationId The ID of the inbox notification to delete.
   */
  public async deleteInboxNotification(params: {
    userId: string;
    inboxNotificationId: string;
  }): Promise<void> {
    const { userId, inboxNotificationId } = params;

    const res = await this.#delete(
      url`/v2/users/${userId}/inbox-notifications/${inboxNotificationId}`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }

  /**
   * Deletes all inbox notifications for a user.
   * @param params.userId The user ID for which to delete all the inbox notifications.
   */
  public async deleteAllInboxNotifications(params: {
    userId: string;
  }): Promise<void> {
    const { userId } = params;

    const res = await this.#delete(
      url`/v2/users/${userId}/inbox-notifications`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new LiveblocksError(res.status, text);
    }
  }
}

export class LiveblocksError extends Error {
  status: number;

  constructor(status: number, message = "") {
    super(message);
    this.name = "LiveblocksError";
    this.status = status;
  }
}
