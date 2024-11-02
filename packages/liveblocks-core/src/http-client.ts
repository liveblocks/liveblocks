import type { AuthManager, AuthValue } from "./auth-manager";
import {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToInboxNotificationData,
  convertToInboxNotificationDeleteInfo,
  convertToThreadData,
  convertToThreadDeleteInfo,
} from "./convert-plain-data";
import { autoRetry, HttpError } from "./lib/autoRetry";
import { Batch } from "./lib/batch";
import { chunk } from "./lib/chunk";
import type { Store } from "./lib/create-store";
import { createCommentId, createThreadId } from "./lib/createIds";
import type { DateToString } from "./lib/DateToString";
import type { Json, JsonObject } from "./lib/Json";
import { objectToQuery } from "./lib/objectToQuery";
import type { QueryParams, URLSafeString } from "./lib/url";
import { url, urljoin } from "./lib/url";
import { raise } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type { ClientMsg } from "./protocol/ClientMsg";
import type {
  BaseMetadata,
  CommentAttachment,
  CommentBody,
  CommentData,
  CommentDataPlain,
  CommentLocalAttachment,
  CommentUserReaction,
  CommentUserReactionPlain,
  QueryMetadata,
  ThreadData,
  ThreadDataPlain,
  ThreadDeleteInfo,
  ThreadDeleteInfoPlain,
} from "./protocol/Comments";
import type {
  InboxNotificationData,
  InboxNotificationDataPlain,
  InboxNotificationDeleteInfo,
  InboxNotificationDeleteInfoPlain,
} from "./protocol/InboxNotifications";
import type { IdTuple, SerializedCrdt } from "./protocol/SerializedCrdt";
import type { HistoryVersion } from "./protocol/VersionHistory";
import type { Patchable } from "./types/Patchable";
import type { RoomNotificationSettings } from "./types/RoomNotificationSettings";
import { PKG_VERSION } from "./version";

export interface RoomHttpApi {
  getThreads<M extends BaseMetadata>(options: {
    roomId: string;
    cursor?: string;
    query?: {
      resolved?: boolean;
      metadata?: Partial<QueryMetadata<M>>;
    };
  }): Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    requestedAt: Date;
    nextCursor: string | null;
  }>;

  getThreadsSince<M extends BaseMetadata>(options: {
    roomId: string;
    since: Date;
    signal?: AbortSignal;
  }): Promise<{
    threads: {
      updated: ThreadData<M>[];
      deleted: ThreadDeleteInfo[];
    };
    inboxNotifications: {
      updated: InboxNotificationData[];
      deleted: InboxNotificationDeleteInfo[];
    };
    requestedAt: Date;
  }>;

  createThread<M extends BaseMetadata>({
    roomId,
    metadata,
    body,
    commentId,
    threadId,
    attachmentIds,
  }: {
    roomId: string;
    threadId?: string;
    commentId?: string;
    metadata: M | undefined;
    body: CommentBody;
    attachmentIds?: string[];
  }): Promise<ThreadData<M>>;

  getThread<M extends BaseMetadata>(options: {
    roomId: string;
    threadId: string;
  }): Promise<{
    thread?: ThreadData<M>;
    inboxNotification?: InboxNotificationData;
  }>;

  deleteThread({
    roomId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
  }): Promise<void>;

  editThreadMetadata<M extends BaseMetadata>({
    roomId,
    metadata,
    threadId,
  }: {
    roomId: string;
    metadata: Patchable<M>;
    threadId: string;
  }): Promise<M>;

  createComment({
    roomId,
    threadId,
    commentId,
    body,
    attachmentIds,
  }: {
    roomId: string;
    threadId: string;
    commentId?: string;
    body: CommentBody;
    attachmentIds?: string[];
  }): Promise<CommentData>;

  editComment({
    roomId,
    threadId,
    commentId,
    body,
    attachmentIds,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    body: CommentBody;
    attachmentIds?: string[];
  }): Promise<CommentData>;

  deleteComment({
    roomId,
    threadId,
    commentId,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
  }): Promise<void>;

  addReaction({
    roomId,
    threadId,
    commentId,
    emoji,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<CommentUserReaction>;

  removeReaction({
    roomId,
    threadId,
    commentId,
    emoji,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void>;

  markThreadAsResolved({
    roomId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
  }): Promise<void>;

  markThreadAsUnresolved({
    roomId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
  }): Promise<void>;

  // Notifications
  markRoomInboxNotificationAsRead({
    roomId,
    inboxNotificationId,
  }: {
    roomId: string;
    inboxNotificationId: string;
  }): Promise<string>;

  getNotificationSettings({
    roomId,
    signal,
  }: {
    roomId: string;
    signal?: AbortSignal;
  }): Promise<RoomNotificationSettings>;

  updateNotificationSettings({
    roomId,
    settings,
  }: {
    roomId: string;
    settings: Partial<RoomNotificationSettings>;
  }): Promise<RoomNotificationSettings>;

  // Attachments
  getAttachmentUrls({
    roomId,
    attachmentIds,
  }: {
    roomId: string;
    attachmentIds: string[];
  }): Promise<(string | null)[]>;

  uploadAttachment({
    roomId,
    attachment,
    signal,
  }: {
    roomId: string;
    attachment: CommentLocalAttachment;
    signal?: AbortSignal;
  }): Promise<CommentAttachment>;

  // Text editor
  createTextMention({
    roomId,
    userId,
    mentionId,
  }: {
    roomId: string;
    userId: string;
    mentionId: string;
  }): Promise<void>;

  deleteTextMention({
    roomId,
    mentionId,
  }: {
    roomId: string;
    mentionId: string;
  }): Promise<void>;

  getTextVersion({
    roomId,
    versionId,
  }: {
    roomId: string;
    versionId: string;
  }): Promise<Response>;

  createTextVersion({ roomId }: { roomId: string }): Promise<void>;

  reportTextEditor({
    roomId,
    type,
    rootKey,
  }: {
    roomId: string;
    type: "lexical";
    rootKey: string;
  }): Promise<void>;

  listTextVersions({ roomId }: { roomId: string }): Promise<{
    versions: {
      type: "historyVersion";
      kind: "yjs";
      id: string;
      authors: {
        id: string;
      }[];
      createdAt: Date;
    }[];
    requestedAt: Date;
  }>;

  listTextVersionsSince({
    roomId,
    since,
    signal,
  }: {
    roomId: string;
    since: Date;
    signal?: AbortSignal;
  }): Promise<{
    versions: {
      type: "historyVersion";
      kind: "yjs";
      id: string;
      authors: {
        id: string;
      }[];
      createdAt: Date;
    }[];
    requestedAt: Date;
  }>;

  streamStorage(options: {
    roomId: string;
    getAuthValue: () => Promise<AuthValue>;
  }): Promise<IdTuple<SerializedCrdt>[]>;

  sendMessages<P extends JsonObject, E extends Json>(options: {
    roomId: string;
    getAuthValue: () => Promise<AuthValue>;
    nonce: string | undefined;
    messages: ClientMsg<P, E>[];
  }): Promise<Response>;
}

export interface NotificationHttpApi {
  getInboxNotifications<M extends BaseMetadata>(options?: {
    cursor?: string;
  }): Promise<{
    inboxNotifications: InboxNotificationData[];
    threads: ThreadData<M>[];
    nextCursor: string | null;
    requestedAt: Date;
  }>;

  getInboxNotificationsSince<M extends BaseMetadata>(options: {
    since: Date;
    signal?: AbortSignal;
  }): Promise<{
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

  getUnreadInboxNotificationsCount(): Promise<number>;

  markAllInboxNotificationsAsRead(): Promise<void>;

  markInboxNotificationAsRead(inboxNotificationId: string): Promise<void>;

  deleteAllInboxNotifications(): Promise<void>;

  deleteInboxNotification(inboxNotificationId: string): Promise<void>;
}

export interface ClientHttpApi extends RoomHttpApi, NotificationHttpApi {
  getUserThreads_experimental<M extends BaseMetadata>(options?: {
    cursor?: string;
    query?: {
      resolved?: boolean;
      metadata?: Partial<QueryMetadata<M>>;
    };
  }): Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    nextCursor: string | null;
    requestedAt: Date;
  }>;

  getUserThreadsSince_experimental<M extends BaseMetadata>(options: {
    since: Date;
    signal?: AbortSignal;
  }): Promise<{
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
}

export function createHttpClient({
  baseUrl,
  authManager,
  currentUserIdStore,
  fetchPolyfill,
}: {
  baseUrl: string;
  authManager: AuthManager;
  currentUserIdStore: Store<string | null>;
  fetchPolyfill: typeof fetch;
}): ClientHttpApi {
  async function getAuthValueForRoom(roomId: string) {
    // TODO: Use the right scope
    const authValue = await authManager.getAuthValue({
      requestedScope: "comments:read",
      roomId,
    });

    return authValue;
  }

  const httpClient = new HttpClient(baseUrl, fetchPolyfill);

  /* -------------------------------------------------------------------------------------------------
   * Threads (Room level)
   * -----------------------------------------------------------------------------------------------*/
  async function getThreadsSince<M extends BaseMetadata>(options: {
    roomId: string;
    since: Date;
    signal?: AbortSignal;
  }) {
    const result = await httpClient.get<{
      data: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>(
      url`/v2/c/rooms/${options.roomId}/threads/delta`,
      () => getAuthValueForRoom(options.roomId),
      { since: options.since.toISOString() },
      { signal: options.signal }
    );

    return {
      threads: {
        updated: result.data.map(convertToThreadData),
        deleted: result.deletedThreads.map(convertToThreadDeleteInfo),
      },
      inboxNotifications: {
        updated: result.inboxNotifications.map(convertToInboxNotificationData),
        deleted: result.deletedInboxNotifications.map(
          convertToInboxNotificationDeleteInfo
        ),
      },
      requestedAt: new Date(result.meta.requestedAt),
    };
  }

  async function getThreads<M extends BaseMetadata>(options: {
    roomId: string;
    cursor?: string;
    query?: {
      resolved?: boolean;
      metadata?: Partial<QueryMetadata<M>>;
    };
  }) {
    let query: string | undefined;

    if (options.query) {
      query = objectToQuery(options.query);
    }

    const PAGE_SIZE = 50;

    const result = await httpClient.get<{
      data: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
      };
    }>(
      url`/v2/c/rooms/${options.roomId}/threads`,
      () => getAuthValueForRoom(options.roomId),
      {
        cursor: options.cursor,
        query,
        limit: PAGE_SIZE,
      }
    );

    return {
      threads: result.data.map(convertToThreadData),
      inboxNotifications: result.inboxNotifications.map(
        convertToInboxNotificationData
      ),
      nextCursor: result.meta.nextCursor,
      requestedAt: new Date(result.meta.requestedAt),
    };
  }

  async function createThread<M extends BaseMetadata>(options: {
    roomId: string;
    threadId?: string;
    commentId?: string;
    metadata: M | undefined;
    body: CommentBody;
    attachmentIds?: string[];
  }) {
    const commentId = options.commentId ?? createCommentId();
    const threadId = options.threadId ?? createThreadId();

    const thread = await httpClient.post<ThreadDataPlain<M>>(
      url`/v2/c/rooms/${options.roomId}/threads`,
      () => getAuthValueForRoom(options.roomId),
      {
        id: threadId,
        comment: {
          id: commentId,
          body: options.body,
          attachmentIds: options.attachmentIds,
        },
        metadata: options.metadata,
      }
    );

    return convertToThreadData<M>(thread);
  }

  async function deleteThread(options: { roomId: string; threadId: string }) {
    await httpClient.delete(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  async function getThread<M extends BaseMetadata>(options: {
    roomId: string;
    threadId: string;
  }) {
    const response = await httpClient.rawGet(
      url`/v2/c/rooms/${options.roomId}/thread-with-notification/${options.threadId}`,
      () => getAuthValueForRoom(options.roomId)
    );

    if (response.ok) {
      const json = (await response.json()) as {
        thread: ThreadDataPlain<M>;
        inboxNotification?: InboxNotificationDataPlain;
      };

      return {
        thread: convertToThreadData(json.thread),
        inboxNotification: json.inboxNotification
          ? convertToInboxNotificationData(json.inboxNotification)
          : undefined,
      };
    } else if (response.status === 404) {
      return {
        thread: undefined,
        inboxNotification: undefined,
      };
    } else {
      throw new Error(
        `There was an error while getting thread ${options.threadId}.`
      );
    }
  }

  async function editThreadMetadata<M extends BaseMetadata>(options: {
    roomId: string;
    metadata: Patchable<M>;
    threadId: string;
  }) {
    return await httpClient.post<M>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/metadata`,
      () => getAuthValueForRoom(options.roomId),
      options.metadata
    );
  }

  async function createComment(options: {
    roomId: string;
    threadId: string;
    commentId?: string;
    body: CommentBody;
    attachmentIds?: string[];
  }) {
    const commentId = options.commentId ?? createCommentId();
    const comment = await httpClient.post<CommentDataPlain>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/comments`,
      () => getAuthValueForRoom(options.roomId),
      {
        id: commentId,
        body: options.body,
        attachmentIds: options.attachmentIds,
      }
    );
    return convertToCommentData(comment);
  }

  async function editComment(options: {
    roomId: string;
    threadId: string;
    commentId: string;
    body: CommentBody;
    attachmentIds?: string[];
  }) {
    const comment = await httpClient.post<CommentDataPlain>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/comments/${options.commentId}`,
      () => getAuthValueForRoom(options.roomId),
      {
        body: options.body,
        attachmentIds: options.attachmentIds,
      }
    );

    return convertToCommentData(comment);
  }

  async function deleteComment(options: {
    roomId: string;
    threadId: string;
    commentId: string;
  }) {
    await httpClient.delete(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/comments/${options.commentId}`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  async function addReaction(options: {
    roomId: string;
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    const reaction = await httpClient.post<CommentUserReactionPlain>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/comments/${options.commentId}/reactions`,
      () => getAuthValueForRoom(options.roomId),
      { emoji: options.emoji }
    );

    return convertToCommentUserReaction(reaction);
  }

  async function removeReaction(options: {
    roomId: string;
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    await httpClient.delete<CommentDataPlain>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/comments/${options.commentId}/reactions/${options.emoji}`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  async function markThreadAsResolved(options: {
    roomId: string;
    threadId: string;
  }) {
    await httpClient.post(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/mark-as-resolved`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  async function markThreadAsUnresolved(options: {
    roomId: string;
    threadId: string;
  }) {
    await httpClient.post(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/mark-as-unresolved`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  /* -------------------------------------------------------------------------------------------------
   * Attachments (Room level)
   * -----------------------------------------------------------------------------------------------*/
  async function getAttachmentUrls(options: {
    roomId: string;
    attachmentIds: string[];
  }) {
    const { urls } = await httpClient.post<{
      urls: (string | null)[];
    }>(
      url`/v2/c/rooms/${options.roomId}/attachments/presigned-urls`,
      () => getAuthValueForRoom(options.roomId),
      {
        attachmentIds: options.attachmentIds,
      }
    );

    return urls;
  }

  async function uploadAttachment(options: {
    roomId: string;
    attachment: CommentLocalAttachment;
    signal?: AbortSignal;
  }): Promise<CommentAttachment> {
    const roomId = options.roomId;
    const abortSignal = options.signal;
    const attachment = options.attachment;

    const abortError = abortSignal
      ? new DOMException(
          `Upload of attachment ${options.attachment.id} was aborted.`,
          "AbortError"
        )
      : undefined;

    if (abortSignal?.aborted) {
      throw abortError;
    }

    const handleRetryError = (err: Error) => {
      if (abortSignal?.aborted) {
        throw abortError;
      }

      if (err instanceof HttpError && err.status === 413) {
        throw err;
      }

      return false;
    };

    const ATTACHMENT_PART_SIZE = 5 * 1024 * 1024; // 5 MB
    const RETRY_ATTEMPTS = 10;
    const RETRY_DELAYS = [
      2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000,
    ];

    function splitFileIntoParts(file: File) {
      const parts: { partNumber: number; part: Blob }[] = [];

      let start = 0;

      while (start < file.size) {
        const end = Math.min(start + ATTACHMENT_PART_SIZE, file.size);

        parts.push({
          partNumber: parts.length + 1,
          part: file.slice(start, end),
        });

        start = end;
      }

      return parts;
    }

    if (attachment.size <= ATTACHMENT_PART_SIZE) {
      // If the file is small enough, upload it in a single request
      return autoRetry(
        () =>
          httpClient.putBlob<CommentAttachment>(
            url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/upload/${encodeURIComponent(attachment.name)}`,
            () => getAuthValueForRoom(roomId),
            attachment.file,
            { fileSize: attachment.size },
            { signal: abortSignal }
          ),
        RETRY_ATTEMPTS,
        RETRY_DELAYS,
        handleRetryError
      );
    } else {
      // Otherwise, upload it in multiple parts
      let uploadId: string | undefined;
      const uploadedParts: {
        etag: string;
        partNumber: number;
      }[] = [];

      // Create a multi-part upload
      const createMultiPartUpload = await autoRetry(
        () =>
          httpClient.post<{
            uploadId: string;
            key: string;
          }>(
            url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/multipart/${encodeURIComponent(attachment.name)}`,
            () => getAuthValueForRoom(roomId),
            undefined,
            { signal: abortSignal },
            { fileSize: attachment.size }
          ),
        RETRY_ATTEMPTS,
        RETRY_DELAYS,
        handleRetryError
      );

      try {
        uploadId = createMultiPartUpload.uploadId;

        const parts = splitFileIntoParts(attachment.file);

        // Check if the upload was aborted
        if (abortSignal?.aborted) {
          throw abortError;
        }

        const batches = chunk(parts, 5);

        // Batches are uploaded one after the other
        for (const parts of batches) {
          const uploadedPartsPromises: Promise<{
            partNumber: number;
            etag: string;
          }>[] = [];

          for (const { part, partNumber } of parts) {
            uploadedPartsPromises.push(
              autoRetry(
                () =>
                  httpClient.putBlob<{
                    partNumber: number;
                    etag: string;
                  }>(
                    url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/multipart/${createMultiPartUpload.uploadId}/${String(partNumber)}`,
                    () => getAuthValueForRoom(roomId),
                    part,
                    undefined,
                    { signal: abortSignal }
                  ),
                RETRY_ATTEMPTS,
                RETRY_DELAYS,
                handleRetryError
              )
            );
          }

          // Parts are uploaded in parallel
          uploadedParts.push(...(await Promise.all(uploadedPartsPromises)));
        }

        // Check if the upload was aborted
        if (abortSignal?.aborted) {
          throw abortError;
        }

        const sortedUploadedParts = uploadedParts.sort(
          (a, b) => a.partNumber - b.partNumber
        );

        return httpClient.post<CommentAttachment>(
          url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/multipart/${uploadId}/complete`,
          () => getAuthValueForRoom(roomId),
          { parts: sortedUploadedParts },
          { signal: abortSignal }
        );
      } catch (error) {
        if (
          uploadId &&
          (error as Error)?.name &&
          ((error as Error).name === "AbortError" ||
            (error as Error).name === "TimeoutError")
        ) {
          try {
            // Abort the multi-part upload if it was created
            await httpClient.rawDelete(
              url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/multipart/${uploadId}`,
              () => getAuthValueForRoom(roomId)
            );
          } catch (error) {
            // Ignore the error, we are probably offline
          }
        }

        throw error;
      }
    }
  }

  /* -------------------------------------------------------------------------------------------------
   * Notifications (Room level)
   * -----------------------------------------------------------------------------------------------*/
  function getNotificationSettings(options: {
    roomId: string;
    signal?: AbortSignal;
  }): Promise<RoomNotificationSettings> {
    return httpClient.get<RoomNotificationSettings>(
      url`/v2/c/rooms/${options.roomId}/notification-settings`,
      () => getAuthValueForRoom(options.roomId),
      undefined,
      {
        signal: options.signal,
      }
    );
  }

  function updateNotificationSettings(options: {
    roomId: string;
    settings: Partial<RoomNotificationSettings>;
  }): Promise<RoomNotificationSettings> {
    return httpClient.post<RoomNotificationSettings>(
      url`/v2/c/rooms/${options.roomId}/notification-settings`,
      () => getAuthValueForRoom(options.roomId),
      options.settings
    );
  }

  // XXX - Batch for a room will remain in memory even when a room is removed from client.
  // XXX - Ensure this does not cause issues when the room is remounted, etc.
  const markInboxNotificationsAsReadBatchByRoom: Map<
    string,
    Batch<string, string>
  > = new Map();
  function getOrCreateMarkInboxNotificationsAsReadBatch(roomId: string) {
    let batch = markInboxNotificationsAsReadBatchByRoom.get(roomId);
    if (batch === undefined) {
      batch = new Batch<string, string>(
        async (batchedInboxNotificationIds) => {
          const inboxNotificationIds = batchedInboxNotificationIds.flat();
          // This method (and the following batch handling) isn't the same as the one in
          // src/notifications.ts, this one is room-based: /v2/c/rooms/<roomId>/inbox-notifications/read.
          //
          // The reason for this is that unlike the room-based Comments ones, the Notifications endpoints
          // don't work with a public key. Since `markThreadAsRead` needs to mark the related inbox notifications
          // as read, this room-based method is necessary to keep all Comments features working with a public key.
          await httpClient.post(
            url`/v2/c/rooms/${roomId}/inbox-notifications/read`,
            () => getAuthValueForRoom(roomId),
            { inboxNotificationIds }
          );
          return inboxNotificationIds;
        },
        {
          delay: 50,
        }
      );

      markInboxNotificationsAsReadBatchByRoom.set(roomId, batch);
    }
    return batch;
  }

  async function markRoomInboxNotificationAsRead(options: {
    roomId: string;
    inboxNotificationId: string;
  }) {
    const batch = getOrCreateMarkInboxNotificationsAsReadBatch(options.roomId);
    return batch.get(options.inboxNotificationId);
  }

  /* -------------------------------------------------------------------------------------------------
   * Text editor (Room level)
   * -----------------------------------------------------------------------------------------------*/
  async function createTextMention(options: {
    roomId: string;
    userId: string;
    mentionId: string;
  }) {
    await httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/text-mentions`,
      () => getAuthValueForRoom(options.roomId),
      {
        userId: options.userId,
        mentionId: options.mentionId,
      }
    );
  }

  async function deleteTextMention(options: {
    roomId: string;
    mentionId: string;
  }) {
    await httpClient.rawDelete(
      url`/v2/c/rooms/${options.roomId}/text-mentions/${options.mentionId}`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  async function getTextVersion(options: {
    roomId: string;
    versionId: string;
  }) {
    return httpClient.rawGet(
      url`/v2/c/rooms/${options.roomId}/y-version/${options.versionId}`,
      () => getAuthValueForRoom(options.roomId)
    );
  }

  async function createTextVersion(options: { roomId: string }) {
    await httpClient.rawPost(url`/v2/c/rooms/${options.roomId}/version`, () =>
      getAuthValueForRoom(options.roomId)
    );
  }

  async function reportTextEditor(options: {
    roomId: string;
    type: "lexical";
    rootKey: string;
  }) {
    await httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/text-metadata`,
      () => getAuthValueForRoom(options.roomId),
      {
        type: options.type,
        rootKey: options.rootKey,
      }
    );
  }

  async function listTextVersions(options: { roomId: string }) {
    const result = await httpClient.get<{
      versions: DateToString<HistoryVersion>[];
      meta: {
        requestedAt: string;
      };
    }>(url`/v2/c/rooms/${options.roomId}/versions`, () =>
      getAuthValueForRoom(options.roomId)
    );

    return {
      versions: result.versions.map(({ createdAt, ...version }) => {
        return {
          createdAt: new Date(createdAt),
          ...version,
        };
      }),
      requestedAt: new Date(result.meta.requestedAt),
    };
  }

  async function listTextVersionsSince(options: {
    roomId: string;
    since: Date;
    signal?: AbortSignal;
  }) {
    const result = await httpClient.get<{
      versions: DateToString<HistoryVersion>[];
      meta: {
        requestedAt: string;
      };
    }>(
      url`/v2/c/rooms/${options.roomId}/versions/delta`,
      () => getAuthValueForRoom(options.roomId),
      { since: options.since.toISOString() },
      { signal: options.signal }
    );

    return {
      versions: result.versions.map(({ createdAt, ...version }) => {
        return {
          createdAt: new Date(createdAt),
          ...version,
        };
      }),
      requestedAt: new Date(result.meta.requestedAt),
    };
  }

  async function streamStorage(options: {
    roomId: string;
    getAuthValue: () => Promise<AuthValue>;
  }) {
    const result = await httpClient.rawGet(
      url`/v2/c/rooms/${options.roomId}/storage`,
      options.getAuthValue
    );
    return (await result.json()) as IdTuple<SerializedCrdt>[];
  }

  async function sendMessages<P extends JsonObject, E extends Json>(options: {
    roomId: string;
    getAuthValue: () => Promise<AuthValue>;
    nonce: string | undefined;
    messages: ClientMsg<P, E>[];
  }) {
    return httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/send-message`,
      options.getAuthValue,
      {
        nonce: options.nonce,
        messages: options.messages,
      }
    );
  }

  /* -------------------------------------------------------------------------------------------------
   * Inbox notifications (User-level)
   * -----------------------------------------------------------------------------------------------*/
  async function getAuthValueForUser() {
    const authValue = await authManager.getAuthValue({
      requestedScope: "comments:read",
    });

    if (
      authValue.type === "secret" &&
      authValue.token.parsed.k === TokenKind.ACCESS_TOKEN
    ) {
      const userId = authValue.token.parsed.uid;

      // NOTE: currentUserIdStore is updated here as a side-effect!
      currentUserIdStore.set(() => userId);
    }

    return authValue;
  }

  async function getInboxNotifications<M extends BaseMetadata>(options?: {
    cursor?: string;
  }) {
    const PAGE_SIZE = 50;

    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
      };
    }>(url`/v2/c/inbox-notifications`, getAuthValueForUser, {
      cursor: options?.cursor,
      limit: PAGE_SIZE,
    });

    return {
      inboxNotifications: json.inboxNotifications.map(
        convertToInboxNotificationData
      ),
      threads: json.threads.map(convertToThreadData),
      nextCursor: json.meta.nextCursor,
      requestedAt: new Date(json.meta.requestedAt),
    };
  }

  async function getInboxNotificationsSince<M extends BaseMetadata>(options: {
    since: Date;
    signal?: AbortSignal;
  }) {
    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>(
      url`/v2/c/inbox-notifications/delta`,
      getAuthValueForUser,
      { since: options.since.toISOString() },
      { signal: options.signal }
    );
    return {
      inboxNotifications: {
        updated: json.inboxNotifications.map(convertToInboxNotificationData),
        deleted: json.deletedInboxNotifications.map(
          convertToInboxNotificationDeleteInfo
        ),
      },
      threads: {
        updated: json.threads.map(convertToThreadData),
        deleted: json.deletedThreads.map(convertToThreadDeleteInfo),
      },
      requestedAt: new Date(json.meta.requestedAt),
    };
  }

  async function getUnreadInboxNotificationsCount() {
    const { count } = await httpClient.get<{ count: number }>(
      url`/v2/c/inbox-notifications/count`,
      getAuthValueForUser
    );
    return count;
  }

  async function markAllInboxNotificationsAsRead() {
    await httpClient.post(
      url`/v2/c/inbox-notifications/read`,
      getAuthValueForUser,
      {
        inboxNotificationIds: "all",
      }
    );
  }

  async function markInboxNotificationsAsRead(inboxNotificationIds: string[]) {
    await httpClient.post(
      url`/v2/c/inbox-notifications/read`,
      getAuthValueForUser,
      {
        inboxNotificationIds,
      }
    );
  }

  const batchedMarkInboxNotificationsAsRead = new Batch<string, string>(
    async (batchedInboxNotificationIds) => {
      const inboxNotificationIds = batchedInboxNotificationIds.flat();

      await markInboxNotificationsAsRead(inboxNotificationIds);

      return inboxNotificationIds;
    },
    { delay: 50 }
  );

  async function markInboxNotificationAsRead(inboxNotificationId: string) {
    await batchedMarkInboxNotificationsAsRead.get(inboxNotificationId);
  }

  async function deleteAllInboxNotifications() {
    await httpClient.delete(
      url`/v2/c/inbox-notifications`,
      getAuthValueForUser
    );
  }

  async function deleteInboxNotification(inboxNotificationId: string) {
    await httpClient.delete(
      url`/v2/c/inbox-notifications/${inboxNotificationId}`,
      getAuthValueForUser
    );
  }

  async function getUserThreads_experimental<M extends BaseMetadata>(options?: {
    cursor?: string;
    query?: {
      resolved?: boolean;
      metadata?: Partial<QueryMetadata<M>>;
    };
  }) {
    let query: string | undefined;

    if (options?.query) {
      query = objectToQuery(options.query);
    }

    const PAGE_SIZE = 50;

    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
      };
    }>(url`/v2/c/threads`, getAuthValueForUser, {
      cursor: options?.cursor,
      query,
      limit: PAGE_SIZE,
    });

    return {
      threads: json.threads.map(convertToThreadData),
      inboxNotifications: json.inboxNotifications.map(
        convertToInboxNotificationData
      ),
      nextCursor: json.meta.nextCursor,
      requestedAt: new Date(json.meta.requestedAt),
    };
  }

  async function getUserThreadsSince_experimental<
    M extends BaseMetadata,
  >(options: { since: Date; signal?: AbortSignal }) {
    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>(
      url`/v2/c/threads/delta`,
      getAuthValueForUser,
      { since: options.since.toISOString() },
      { signal: options.signal }
    );

    return {
      threads: {
        updated: json.threads.map(convertToThreadData),
        deleted: json.deletedThreads.map(convertToThreadDeleteInfo),
      },
      inboxNotifications: {
        updated: json.inboxNotifications.map(convertToInboxNotificationData),
        deleted: json.deletedInboxNotifications.map(
          convertToInboxNotificationDeleteInfo
        ),
      },
      requestedAt: new Date(json.meta.requestedAt),
    };
  }

  return {
    // Room threads
    getThreads,
    getThreadsSince,
    createThread,
    getThread,
    deleteThread,
    editThreadMetadata,
    createComment,
    editComment,
    deleteComment,
    addReaction,
    removeReaction,
    markThreadAsResolved,
    markThreadAsUnresolved,
    // Room notifications
    markRoomInboxNotificationAsRead,
    updateNotificationSettings,
    getNotificationSettings,
    // Room text editor
    createTextMention,
    deleteTextMention,
    getTextVersion,
    createTextVersion,
    reportTextEditor,
    listTextVersions,
    listTextVersionsSince,
    // Room attachments
    getAttachmentUrls,
    uploadAttachment,
    // Room storage
    streamStorage,
    sendMessages,
    // Notification
    getInboxNotifications,
    getInboxNotificationsSince,
    getUnreadInboxNotificationsCount,
    markAllInboxNotificationsAsRead,
    markInboxNotificationAsRead,
    deleteAllInboxNotifications,
    deleteInboxNotification,
    // User threads
    getUserThreads_experimental,
    getUserThreadsSince_experimental,
  };
}

export function getBearerTokenFromAuthValue(authValue: AuthValue): string {
  if (authValue.type === "public") {
    return authValue.publicApiKey;
  } else {
    return authValue.token.raw;
  }
}

/**
 * @internal
 *
 * Small HTTP client for client-only REST API requests (e.g. /v2/c/* URLs).
 * These URLs all use public key, ID token, or access token authorization. This
 * HTTP client can be shared and used by both the Liveblocks Client and
 * Liveblocks Room instances internally to talk to our client-only REST API
 * backend.
 */
class HttpClient {
  private _baseUrl: string;
  private _fetchPolyfill: typeof fetch;

  constructor(baseUrl: string, fetchPolyfill: typeof fetch) {
    this._baseUrl = baseUrl;
    this._fetchPolyfill = fetchPolyfill;
  }

  // ------------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------------

  /**
   * Constructs and makes the HTTP request, but does not handle the response.
   *
   * This is what .rawFetch() does:    👈 This method!
   *   1. Set Content-Type header
   *   2. Set Authorization header
   *   3. Call the callback to obtain the `authValue` to use in the Authorization header
   *
   * This is what .fetch() does ON TOP of that:
   *   4. Parse response body as Json
   *   5. ...but silently return `{}` if that parsing fails
   *   6. Throw HttpError if response is an error
   */
  private async rawFetch(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<Response> {
    if (!endpoint.startsWith("/v2/c/")) {
      raise("This client can only be used to make /v2/c/* requests");
    }

    const url = urljoin(this._baseUrl, endpoint, params);
    return await this._fetchPolyfill(url, {
      ...options,
      headers: {
        // These headers are default, but can be overriden by custom headers
        "Content-Type": "application/json; charset=utf-8",

        // Possible header overrides
        ...options?.headers,

        // Cannot be overriden by custom headers
        Authorization: `Bearer ${getBearerTokenFromAuthValue(await authCallback())}`,
        "X-LB-Client": PKG_VERSION || "dev",
      },
    });
  }

  /**
   * Constructs, makes the HTTP request, and handles the response by parsing
   * JSON and/or throwing an HttpError if it failed.
   *
   * This is what .rawFetch() does:
   *   1. Set Content-Type header
   *   2. Set Authorization header
   *   3. Call the callback to obtain the `authValue` to use in the Authorization header
   *
   * This is what .fetch() does ON TOP of that:   👈 This method!
   *   4. Parse response body as Json
   *   5. ...but silently return `{}` if that parsing fails (🤔)
   *   6. Throw HttpError if response is an error
   */
  private async fetch<T extends JsonObject>(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await this.rawFetch(
      endpoint,
      authCallback,
      options,
      params
    );

    if (!response.ok) {
      let error: HttpError;
      try {
        const errorBody = (await response.json()) as { message: string };
        error = new HttpError(errorBody.message, response.status, errorBody);
      } catch {
        error = new HttpError(response.statusText, response.status);
      }
      throw error;
    }

    let body;
    try {
      body = (await response.json()) as T;
    } catch {
      // TODO This looks wrong 🤔 !
      // TODO Should we not be throwing this error if something fails to parse?
      body = {} as T;
    }
    return body;
  }

  /**
   * Makes a GET request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .get() instead.
   */
  public async rawGet(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<Response> {
    return await this.rawFetch(endpoint, authCallback, options, params);
  }

  /**
   * Makes a POST request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .post() instead.
   */
  public async rawPost(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    body?: JsonObject
  ): Promise<Response> {
    return await this.rawFetch(endpoint, authCallback, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Makes a DELETE request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .delete() instead.
   */
  public async rawDelete(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>
  ): Promise<Response> {
    return await this.rawFetch(endpoint, authCallback, { method: "DELETE" });
  }

  /**
   * Makes a GET request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async get<T extends JsonObject>(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<T> {
    return await this.fetch<T>(endpoint, authCallback, options, params);
  }

  /**
   * Makes a POST request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async post<T extends JsonObject>(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    body?: JsonObject,
    options?: Omit<RequestInit, "body" | "method" | "headers">,
    params?: QueryParams
  ): Promise<T> {
    return await this.fetch<T>(
      endpoint,
      authCallback,
      {
        ...options,
        method: "POST",
        body: JSON.stringify(body),
      },
      params
    );
  }

  /**
   * Makes a DELETE request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async delete<T extends JsonObject>(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>
  ): Promise<T> {
    return await this.fetch<T>(endpoint, authCallback, { method: "DELETE" });
  }

  /**
   * Makes a PUT request for a Blob body, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async putBlob<T extends JsonObject>(
    endpoint: URLSafeString,
    authCallback: () => Promise<AuthValue>,
    blob?: Blob,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<T> {
    return await this.fetch<T>(
      endpoint,
      authCallback,
      {
        ...options,
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: blob,
      },
      params
    );
  }
}
