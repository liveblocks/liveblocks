/**
 * NOTE: only types should be imported from @liveblocks/core.
 * This is because this package is made to be used in Node.js, and
 * @liveblocks/core has browser-specific code.
 */
import type { CommentData, ThreadData } from "@liveblocks/core";

import { Session } from "./Session";
import {
  assertNonEmpty,
  assertSecretKey,
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
   * @internal
   * Allow overriding the base URL for testing purposes only.
   * Default value is https://api.liveblocks.io
   */
  liveblocksBaseUrl?: string;
};

export type CreateSessionOptions = {
  userInfo: unknown;
};

const DEFAULT_BASE_URL = "https://api.liveblocks.io";

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
    this._baseUrl = new URL(
      typeof options_.liveblocksBaseUrl === "string"
        ? options_.liveblocksBaseUrl
        : DEFAULT_BASE_URL
    );
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
  private async get(path: `/${string}`): Promise<Response> {
    const url = urljoin(this._baseUrl, path);
    const headers = {
      Authorization: `Bearer ${this._secret}`,
      "Content-Type": "application/json",
    };

    const fetch = await fetchPolyfill();
    return fetch(url, { method: "GET", headers });
  }

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
        body: await resp.text(),
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
