/**
 * NOTE: only types should be imported from @liveblocks/core.
 * This is because this package is made to be used in Node.js, and
 * @liveblocks/core has browser-specific code.
 */
import type {
  CommentData,
  JsonObject,
  PlainLsonObject,
  ThreadData,
} from "@liveblocks/core";

import { Session } from "./Session";
import {
  assertNonEmpty,
  assertSecretKey,
  DEFAULT_BASE_URL,
  fetchPolyfill,
  normalizeStatusCode,
  urljoin,
} from "./utils";

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

export type CreateSessionOptions = {
  userInfo: unknown;
};

export type AuthResponse = {
  status: number;
  body: string;
  error?: Error;
};

type Identity = {
  userId: string;
  groupIds: string[];
};

type ThreadParticipants = {
  participantIds: string[];
};

type Permission = "room:write" | "room:read" | "room:presence:write";
type RoomAccesses = Record<string, Permission[]>;
type RoomMetadata = Record<string, string | string[]>;

type RoomInfo = {
  type: "room";
  id: string;
  lastConnectionAt?: string;
  createdAt?: string;
  metadata: RoomMetadata;
  groupsAccesses: RoomAccesses;
  usersAccesses: RoomAccesses;
  defaultAccesses: Permission[];
  schema?: string;
};

type RoomUser<Info> = {
  type: "user";
  id: string | null;
  connectionId: number;
  info: Info;
};

type YJson =
  | {
      [x: string]: unknown;
    }
  | string
  | undefined
  | unknown[];

/**
 * Interact with the Liveblocks API from your Node.js backend.
 */
export class Liveblocks {
  /** @internal */
  private readonly _secret: string;
  /** @internal */
  private readonly _baseUrl: URL;

  /**
   * Interact with the Liveblocks API from your Node.js backend.
   */
  constructor(options: LiveblocksOptions) {
    const options_ = options as Record<string, unknown>;
    const secret = options_.secret;
    assertSecretKey(secret, "secret");
    this._secret = secret;
    this._baseUrl = new URL(options.baseUrl ?? DEFAULT_BASE_URL);
  }

  /** @internal */
  private async post(
    path: `/${string}`,
    json: Record<string, unknown>
  ): Promise<Response> {
    const url = urljoin(this._baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this._secret}`,
      "Content-Type": "application/json",
    };

    const fetch = await fetchPolyfill();
    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(json),
    });
  }

  /** @internal */
  private async put(
    path: `/${string}`,
    json: Record<string, unknown>
  ): Promise<Response> {
    const url = urljoin(this._baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this._secret}`,
      "Content-Type": "application/json",
    };

    const fetch = await fetchPolyfill();
    return fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(json),
    });
  }

  /** @internal */
  private async delete(path: `/${string}`): Promise<Response> {
    const url = urljoin(this._baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this._secret}`,
    };

    const fetch = await fetchPolyfill();
    return fetch(url, { method: "DELETE", headers });
  }

  /** @internal */
  private async get(path: `/${string}`): Promise<Response> {
    const url = urljoin(this._baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this._secret}`,
      "Content-Type": "application/json",
    };

    const fetch = await fetchPolyfill();
    return fetch(url, { method: "GET", headers });
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
  prepareSession(userId: string, options?: CreateSessionOptions): Session {
    return new Session(this.post.bind(this), userId, options?.userInfo);
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
    options?: {
      userInfo: unknown;
      // ....
    }
  ): Promise<AuthResponse> {
    const path = "/v2/identify-user";
    const userId = typeof identity === "string" ? identity : identity.userId;
    const groupIds =
      typeof identity === "string" ? undefined : identity.groupIds;

    assertNonEmpty(userId, "userId"); // TODO: Check if this is a legal userId value too
    // assertStringArrayOrUndefined(groupsIds, "groupIds"); // TODO: Check if this is a legal userId value too

    try {
      const resp = await this.post(path, {
        userId,
        groupIds,

        // Optional metadata
        userInfo: options?.userInfo,
      });

      return {
        status: normalizeStatusCode(resp.status),
        body: await resp.json(),
      };
    } catch (er) {
      return {
        status: 503 /* Service Unavailable */,
        body: `Call to ${urljoin(
          this._baseUrl,
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
   * @param params.userId A filter on users accesses.
   * @param params.metadata A filter on metadata. Multiple metadata keys can be used to filter rooms.
   * @param params.groupIds A filter on groups accesses. Multiple groups can be used.
   * @returns A list of rooms.
   */
  public async getRooms(params: {
    limit?: number;
    startingAfter?: number;
    metadata: RoomMetadata;
    userId: string;
    groupIds: string;
  }): Promise<{
    nextPage: string | null;
    data: RoomInfo[];
  }> {
    let path = "v2/rooms?";
    if (params.limit) {
      path += `&limit=${params.limit}`;
    }

    if (params.startingAfter) {
      path += `&startingAfter=${params.startingAfter}`;
    }

    if (params.userId) {
      path += `&userId=${params.userId}`;
    }

    if (params.groupIds) {
      path += `&groupIds=${params.groupIds}`;
    }

    if (params.metadata) {
      Object.entries(params.metadata).forEach(([key, val]) => {
        path += `&metadata.${key}=${val}`;
      });
    }

    const res = await this.get(`/${path}`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Creates a new room with the given id.
   * @param roomId The id of the room to create.
   * @param params.defaultAccesses The default accesses for the room.
   * @param params.groupAccesses (optional) The group accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.userAccesses (optional) The user accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @returns The created room.
   */
  public async createRoom(
    roomId: string,
    params: {
      defaultAccesses: Permission[];
      groupAccesses?: RoomAccesses;
      userAccesses?: RoomAccesses;
      metadata?: RoomMetadata;
    }
  ): Promise<RoomInfo> {
    const { defaultAccesses, groupAccesses, userAccesses, metadata } = params;

    const path = "/v2/rooms";

    const res = await this.post(path, {
      roomId,
      defaultAccesses,
      groupAccesses,
      userAccesses,
      metadata,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Returns a room with the given id.
   * @param roomId The id of the room to return.
   * @returns The room with the given id.
   */
  public async getRoom(roomId: string): Promise<RoomInfo> {
    const res = await this.get(`/v2/rooms/${roomId}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Updates specific properties of a room. It’s not necessary to provide the entire room’s information.
   * Setting a property to `null` means to delete this property.
   * @param roomId The id of the room to update.
   * @param params.defaultAccesses (optional) The default accesses for the room.
   * @param params.groupAccesses (optional) The group accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.userAccesses (optional) The user accesses for the room. Can contain a maximum of 100 entries. Key length has a limit of 40 characters.
   * @param params.metadata (optional) The metadata for the room. Supports upto a maximum of 50 entries. Key length has a limit of 40 characters. Value length has a limit of 256 characters.
   * @returns The updated room.
   */
  public async updateRoom(
    roomId: string,
    params: {
      defaultAccesses?: Permission[] | null;
      groupAccesses?: Record<string, Permission[] | null>;
      userAccesses?: Record<string, Permission[] | null>;
      metadata?: Record<string, string | string[] | null>;
    }
  ): Promise<RoomInfo> {
    const { defaultAccesses, groupAccesses, userAccesses, metadata } = params;

    const res = await this.post(`/v2/rooms/${roomId}`, {
      defaultAccesses,
      groupAccesses,
      userAccesses,
      metadata,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Deletes a room with the given id. A deleted room is no longer accessible from the API or the dashboard and it cannot be restored.
   * @param roomId The id of the room to delete.
   */
  public async deleteRoom(roomId: string) {
    const res = await this.delete(`/v2/rooms/${roomId}`);
    if (res.ok) return;

    const errorText = await res.text();
    throw new Error(`Server responded with ${res.status}: ${errorText}`);
  }

  /**
   * Returns a list of users currently present in the requested room. For better performance, we recommand to call this endpoint every 10 seconds maximum. Duplicates can happen if a user is in the requested room with multiple browser tabs opened.
   * @param roomId The id of the room to get the users from.
   * @returns A list of users currently present in the requested room.
   */
  public async getActiveUsers<T = unknown>(
    roomId: string
  ): Promise<RoomUser<T>[]> {
    const res = await this.get(`/v2/rooms/${roomId}/active_users`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Boadcasts an event to a room without having to connect to it via the client from @liveblocks/client.
   * @param roomId The id of the room to broadcast the event to.
   */
  public async broadcastMessage(
    roomId: string,
    message: Record<string, unknown>
  ): Promise<void> {
    const res = await this.post(`/v2/rooms/${roomId}/broadcast_event`, message);
    if (res.ok) return;

    const errorText = await res.text();
    throw new Error(`Server responded with ${res.status}: ${errorText}`);
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
  ): Promise<JsonObject>;

  public async getStorageDocument(
    roomId: string,
    format: "plain-lson" | "json" = "plain-lson"
  ): Promise<PlainLsonObject | JsonObject> {
    let path = `v2/rooms/${roomId}/storage`;
    if (format === "json") {
      path += "?format=json";
    }
    const res = await this.get(`/${path}`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
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
    const res = await this.post(`/v2/rooms/${roomId}/storage`, document);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.json();
  }
  /**
   * Deletes all of the room’s Storage data and disconnect all users from the room if there are any.
   * @param roomId The id of the room to delete the storage from.
   */
  public async deleteStorage(roomId: string): Promise<void> {
    const res = await this.delete(`/v2/rooms/${roomId}/storage`);
    if (res.ok) return;

    const errorText = await res.text();
    throw new Error(`Server responded with ${res.status}: ${errorText}`);
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
  ): Promise<Record<string, YJson>> {
    const { format, key, type } = params;

    let path = `v2/rooms/${roomId}/ydoc?`;
    if (format) {
      path += "&formatting=true";
    }

    if (key) {
      path += `&key=${key}`;
    }

    if (type) {
      path += `&type=${type}`;
    }

    const res = await this.get(`/${path}`);
    const body = await res.json();

    if (res.status !== 200) {
      throw {
        status: res.status,
        ...body,
      };
    }

    return body;
  }

  /**
   * Ssend a Yjs binary update to the room’s Yjs document. You can use this endpoint to initialize Yjs data for the room or to update the room’s Yjs document.
   * @param roomId The id of the room to send the Yjs binary update to.
   * @param params The Yjs binary update to send. Read the [Yjs documentation](https://docs.yjs.dev/api/document-updates) to learn how to create a binary update.
   */
  public async sendYjsBinaryUpdate(
    roomId: string,
    params: {
      update: string;
    }
  ): Promise<void> {
    const { update } = params;

    const res = await this.put(`/v2/rooms/${roomId}/ydoc`, {
      update,
    });

    if (res.ok) return;

    const errorText = await res.text();
    throw new Error(`Server responded with ${res.status}: ${errorText}`);
  }

  /**
   * Returns the room’s Yjs document encoded as a single binary update. This can be used by Y.applyUpdate(responseBody) to get a copy of the document in your backend.
   * See [Yjs documentation](https://docs.yjs.dev/api/document-updates) for more information on working with updates.
   * @param roomId The id of the room to get the Yjs document from.
   * @returns The room’s Yjs document encoded as a single binary update.
   */
  public async getYjsDocumentAsBinaryUpdate(
    roomId: string
  ): Promise<ArrayBuffer> {
    const res = await this.get(`/v2/rooms/${roomId}/ydoc-binary`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server responded with ${res.status}: ${errorText}`);
    }

    return res.arrayBuffer();
  }

  /* -------------------------------------------------------------------------------------------------
   * Comments
   * -----------------------------------------------------------------------------------------------*/

  /**
   * Gets all the threads in a room.
   *
   * @param params.roomId The room ID to get the threads from.
   * @returns A list of threads.
   */
  public async getThreads(params: { roomId: string }): Promise<ThreadData[]> {
    const { roomId } = params;

    const resp = await this.get(
      `/v2/rooms/${encodeURIComponent(roomId)}/threads`
    );

    const body = await (resp.json() as Promise<ThreadData[]>);

    if (resp.status !== 200) {
      throw {
        status: resp.status,
        ...body,
      };
    }

    return body;
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
  }): Promise<ThreadData> {
    const { roomId, threadId } = params;

    const resp = await this.get(
      `/v2/rooms/${encodeURIComponent(roomId)}/threads/${encodeURIComponent(
        threadId
      )}`
    );

    const body = await (resp.json() as Promise<ThreadData>);

    if (resp.status !== 200) {
      throw {
        status: resp.status,
        ...body,
      };
    }

    return body;
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

    const resp = await this.get(
      `/v2/rooms/${encodeURIComponent(roomId)}/threads/${encodeURIComponent(
        threadId
      )}/participants`
    );

    const body = await (resp.json() as Promise<ThreadParticipants>);

    if (resp.status !== 200) {
      throw {
        status: resp.status,
        ...body,
      };
    }

    return body;
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

    const resp = await this.get(
      `/v2/rooms/${encodeURIComponent(roomId)}/threads/${encodeURIComponent(
        threadId
      )}/comments/${encodeURIComponent(commentId)}`
    );

    const body = await (resp.json() as Promise<CommentData>);

    if (resp.status !== 200) {
      throw {
        status: resp.status,
        ...body,
      };
    }

    return body;
  }
}
