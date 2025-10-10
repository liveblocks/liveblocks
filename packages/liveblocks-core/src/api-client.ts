import type { AuthManager, AuthValue } from "./auth-manager";
import {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToGroupData,
  convertToInboxNotificationData,
  convertToInboxNotificationDeleteInfo,
  convertToSubscriptionData,
  convertToSubscriptionDeleteInfo,
  convertToThreadData,
  convertToThreadDeleteInfo,
} from "./convert-plain-data";
import { assertNever } from "./lib/assert";
import { autoRetry, HttpError } from "./lib/autoRetry";
import type { BatchStore } from "./lib/batch";
import { Batch, createBatchStore } from "./lib/batch";
import { chunk } from "./lib/chunk";
import { createCommentId, createThreadId } from "./lib/createIds";
import type { DateToString } from "./lib/DateToString";
import { DefaultMap } from "./lib/DefaultMap";
import type { Json, JsonObject } from "./lib/Json";
import { objectToQuery } from "./lib/objectToQuery";
import type { Signal } from "./lib/signals";
import { stringifyOrLog as stringify } from "./lib/stringify";
import type { QueryParams, URLSafeString } from "./lib/url";
import { url, urljoin } from "./lib/url";
import { raise } from "./lib/utils";
import type {
  ContextualPromptContext,
  ContextualPromptResponse,
} from "./protocol/Ai";
import type { Permission } from "./protocol/AuthToken";
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
import type { GroupData, GroupDataPlain } from "./protocol/Groups";
import type {
  InboxNotificationData,
  InboxNotificationDataPlain,
  InboxNotificationDeleteInfo,
  InboxNotificationDeleteInfoPlain,
} from "./protocol/InboxNotifications";
import type { MentionData } from "./protocol/MentionData";
import type {
  NotificationSettingsPlain,
  PartialNotificationSettings,
} from "./protocol/NotificationSettings";
import type { RoomSubscriptionSettings } from "./protocol/RoomSubscriptionSettings";
import type { IdTuple, SerializedCrdt } from "./protocol/SerializedCrdt";
import type {
  SubscriptionData,
  SubscriptionDataPlain,
  SubscriptionDeleteInfo,
  SubscriptionDeleteInfoPlain,
} from "./protocol/Subscriptions";
import type { UrlMetadata } from "./protocol/UrlMetadata";
import type { HistoryVersion } from "./protocol/VersionHistory";
import type { TextEditorType } from "./types/Others";
import type { Patchable } from "./types/Patchable";
import { PKG_VERSION } from "./version";

export interface RoomHttpApi<M extends BaseMetadata> {
  getThreads(options: {
    roomId: string;
    cursor?: string;
    query?: {
      resolved?: boolean;
      metadata?: Partial<QueryMetadata<M>>;
    };
  }): Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    subscriptions: SubscriptionData[];
    requestedAt: Date;
    nextCursor: string | null;
    permissionHints: Record<string, Permission[]>;
  }>;

  getThreadsSince(options: {
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
    subscriptions: {
      updated: SubscriptionData[];
      deleted: SubscriptionDeleteInfo[];
    };
    requestedAt: Date;
    permissionHints: Record<string, Permission[]>;
  }>;

  createThread({
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

  getThread(options: { roomId: string; threadId: string }): Promise<{
    thread?: ThreadData<M>;
    inboxNotification?: InboxNotificationData;
    subscription?: SubscriptionData;
  }>;

  deleteThread({
    roomId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
  }): Promise<void>;

  editThreadMetadata({
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

  subscribeToThread({
    roomId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
  }): Promise<SubscriptionData>;

  unsubscribeFromThread({
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

  getSubscriptionSettings({
    roomId,
    signal,
  }: {
    roomId: string;
    signal?: AbortSignal;
  }): Promise<RoomSubscriptionSettings>;

  updateSubscriptionSettings({
    roomId,
    settings,
  }: {
    roomId: string;
    settings: Partial<RoomSubscriptionSettings>;
  }): Promise<RoomSubscriptionSettings>;

  // Attachments
  getAttachmentUrl(options: {
    roomId: string;
    attachmentId: string;
  }): Promise<string>;

  uploadAttachment({
    roomId,
    attachment,
    signal,
  }: {
    roomId: string;
    attachment: CommentLocalAttachment;
    signal?: AbortSignal;
  }): Promise<CommentAttachment>;

  getOrCreateAttachmentUrlsStore(roomId: string): BatchStore<string, string>;

  uploadChatAttachment({
    chatId,
    attachment,
    signal,
  }: {
    chatId: string;
    attachment: { id: string; file: File };
    signal?: AbortSignal;
  }): Promise<void>;

  getOrCreateChatAttachmentUrlsStore(
    chatId: string
  ): BatchStore<string, string>;
  getChatAttachmentUrl(options: { attachmentId: string }): Promise<string>;

  // Text editor
  createTextMention({
    roomId,
    mentionId,
    mention,
  }: {
    roomId: string;
    mentionId: string;
    mention: MentionData;
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
    type: TextEditorType;
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
  }): Promise<IdTuple<SerializedCrdt>[]>;

  sendMessagesOverHTTP<P extends JsonObject, E extends Json>(options: {
    roomId: string;
    nonce: string | undefined;
    messages: ClientMsg<P, E>[];
  }): Promise<Response>;

  executeContextualPrompt({
    roomId,
    prompt,
    context,
    signal,
  }: {
    roomId: string;
    prompt: string;
    context: ContextualPromptContext;
    previous?: {
      prompt: string;
      response: ContextualPromptResponse;
    };
    signal: AbortSignal;
  }): Promise<string>;
}

export interface NotificationHttpApi<M extends BaseMetadata> {
  getInboxNotifications(options?: {
    cursor?: string;
    query?: { roomId?: string; kind?: string };
  }): Promise<{
    inboxNotifications: InboxNotificationData[];
    threads: ThreadData<M>[];
    subscriptions: SubscriptionData[];
    nextCursor: string | null;
    requestedAt: Date;
  }>;

  getInboxNotificationsSince(options: {
    since: Date;
    query?: { roomId?: string; kind?: string };
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
    subscriptions: {
      updated: SubscriptionData[];
      deleted: SubscriptionDeleteInfo[];
    };
    requestedAt: Date;
  }>;

  getUnreadInboxNotificationsCount(options?: {
    query?: {
      roomId?: string;
      kind?: string;
    };
    signal?: AbortSignal;
  }): Promise<number>;

  markAllInboxNotificationsAsRead(): Promise<void>;

  markInboxNotificationAsRead(inboxNotificationId: string): Promise<void>;

  deleteAllInboxNotifications(): Promise<void>;

  deleteInboxNotification(inboxNotificationId: string): Promise<void>;

  getNotificationSettings(options?: {
    signal?: AbortSignal;
  }): Promise<NotificationSettingsPlain>;

  updateNotificationSettings(
    settings: PartialNotificationSettings
  ): Promise<NotificationSettingsPlain>;
}

export interface LiveblocksHttpApi<M extends BaseMetadata>
  extends RoomHttpApi<M>,
    NotificationHttpApi<M> {
  getUrlMetadata(url: string): Promise<UrlMetadata>;

  getUserThreads_experimental(options?: {
    cursor?: string;
    query?: {
      resolved?: boolean;
      metadata?: Partial<QueryMetadata<M>>;
    };
  }): Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    subscriptions: SubscriptionData[];
    nextCursor: string | null;
    requestedAt: Date;
    permissionHints: Record<string, Permission[]>;
  }>;

  getUserThreadsSince_experimental(options: {
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
    subscriptions: {
      updated: SubscriptionData[];
      deleted: SubscriptionDeleteInfo[];
    };
    requestedAt: Date;
    permissionHints: Record<string, Permission[]>;
  }>;

  groupsStore: BatchStore<GroupData | undefined, string>;

  getGroup(groupId: string): Promise<GroupData | undefined>;
}

export function createApiClient<M extends BaseMetadata>({
  baseUrl,
  authManager,
  currentUserId,
  fetchPolyfill,
}: {
  baseUrl: string;
  authManager: AuthManager;
  currentUserId: Signal<string | undefined>;
  fetchPolyfill: typeof fetch;
}): LiveblocksHttpApi<M> {
  const httpClient = new HttpClient(baseUrl, fetchPolyfill);

  /* -------------------------------------------------------------------------------------------------
   * Threads (Room level)
   * -----------------------------------------------------------------------------------------------*/
  async function getThreadsSince(options: {
    roomId: string;
    since: Date;
    signal?: AbortSignal;
  }) {
    const result = await httpClient.get<{
      data: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      subscriptions: SubscriptionDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      deletedSubscriptions: SubscriptionDeleteInfoPlain[];
      meta: {
        requestedAt: string;
        permissionHints: Record<string, Permission[]>;
      };
    }>(
      url`/v2/c/rooms/${options.roomId}/threads/delta`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
      {
        since: options.since.toISOString(),
      },
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
      subscriptions: {
        updated: result.subscriptions.map(convertToSubscriptionData),
        deleted: result.deletedSubscriptions.map(
          convertToSubscriptionDeleteInfo
        ),
      },
      requestedAt: new Date(result.meta.requestedAt),
      permissionHints: result.meta.permissionHints,
    };
  }

  async function getThreads(options: {
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

    try {
      const result = await httpClient.get<{
        data: ThreadDataPlain<M>[];
        inboxNotifications: InboxNotificationDataPlain[];
        subscriptions: SubscriptionDataPlain[];
        deletedThreads: ThreadDeleteInfoPlain[];
        deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
        deletedSubscriptions: SubscriptionDeleteInfoPlain[];
        meta: {
          requestedAt: string;
          nextCursor: string | null;
          permissionHints: Record<string, Permission[]>;
        };
      }>(
        url`/v2/c/rooms/${options.roomId}/threads`,
        await authManager.getAuthValue({
          requestedScope: "comments:read",
          roomId: options.roomId,
        }),
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
        subscriptions: result.subscriptions.map(convertToSubscriptionData),
        nextCursor: result.meta.nextCursor,
        requestedAt: new Date(result.meta.requestedAt),
        permissionHints: result.meta.permissionHints,
      };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        // If the room does (not) yet exist, the response will be a 404 error
        // response which we'll interpret as an empty list of threads.
        return {
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          nextCursor: null,
          //
          // HACK
          // requestedAt needs to be a *server* timestamp here. However, on
          // this 404 error response, there is no such timestamp. So out of
          // pure necessity we'll fall back to a local timestamp instead (and
          // allow for a possible 6 hour clock difference between client and
          // server).
          //
          requestedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          permissionHints: {},
        };
      }

      throw err;
    }
  }

  async function createThread(options: {
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function getThread(options: { roomId: string; threadId: string }) {
    const response = await httpClient.rawGet(
      url`/v2/c/rooms/${options.roomId}/thread-with-notification/${options.threadId}`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );

    if (response.ok) {
      const json = (await response.json()) as {
        thread: ThreadDataPlain<M>;
        inboxNotification?: InboxNotificationDataPlain;
        subscription?: SubscriptionDataPlain;
      };

      return {
        thread: convertToThreadData(json.thread),
        inboxNotification: json.inboxNotification
          ? convertToInboxNotificationData(json.inboxNotification)
          : undefined,
        subscription: json.subscription
          ? convertToSubscriptionData(json.subscription)
          : undefined,
      };
    } else if (response.status === 404) {
      return {
        thread: undefined,
        inboxNotification: undefined,
        subscription: undefined,
      };
    } else {
      throw new Error(
        `There was an error while getting thread ${options.threadId}.`
      );
    }
  }

  async function editThreadMetadata(options: {
    roomId: string;
    metadata: Patchable<M>;
    threadId: string;
  }) {
    return await httpClient.post<M>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/metadata`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function markThreadAsResolved(options: {
    roomId: string;
    threadId: string;
  }) {
    await httpClient.post(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/mark-as-resolved`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function markThreadAsUnresolved(options: {
    roomId: string;
    threadId: string;
  }) {
    await httpClient.post(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/mark-as-unresolved`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function subscribeToThread(options: {
    roomId: string;
    threadId: string;
  }) {
    const subscription = await httpClient.post<SubscriptionDataPlain>(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/subscribe`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );

    return convertToSubscriptionData(subscription);
  }

  async function unsubscribeFromThread(options: {
    roomId: string;
    threadId: string;
  }) {
    await httpClient.post(
      url`/v2/c/rooms/${options.roomId}/threads/${options.threadId}/unsubscribe`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  /* -------------------------------------------------------------------------------------------------
   * Attachments (Room level)
   * -----------------------------------------------------------------------------------------------*/
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
        async () =>
          httpClient.putBlob<CommentAttachment>(
            url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/upload/${encodeURIComponent(attachment.name)}`,
            await authManager.getAuthValue({
              requestedScope: "comments:read",
              roomId,
            }),
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
        async () =>
          httpClient.post<{
            uploadId: string;
            key: string;
          }>(
            url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/multipart/${encodeURIComponent(attachment.name)}`,
            await authManager.getAuthValue({
              requestedScope: "comments:read",
              roomId,
            }),
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
                async () =>
                  httpClient.putBlob<{
                    partNumber: number;
                    etag: string;
                  }>(
                    url`/v2/c/rooms/${roomId}/attachments/${attachment.id}/multipart/${createMultiPartUpload.uploadId}/${String(partNumber)}`,
                    await authManager.getAuthValue({
                      requestedScope: "comments:read",
                      roomId,
                    }),
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
          await authManager.getAuthValue({
            requestedScope: "comments:read",
            roomId,
          }),
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
              await authManager.getAuthValue({
                requestedScope: "comments:read",
                roomId,
              })
            );
          } catch (error) {
            // Ignore the error, we are probably offline
          }
        }

        throw error;
      }
    }
  }

  const attachmentUrlsBatchStoresByRoom = new DefaultMap<
    string,
    BatchStore<string, string>
  >((roomId) => {
    const batch = new Batch<string, string>(
      async (batchedAttachmentIds) => {
        const attachmentIds = batchedAttachmentIds.flat();
        const { urls } = await httpClient.post<{
          urls: (string | null)[];
        }>(
          url`/v2/c/rooms/${roomId}/attachments/presigned-urls`,
          await authManager.getAuthValue({
            requestedScope: "comments:read",
            roomId,
          }),
          { attachmentIds }
        );

        return urls.map(
          (url) =>
            url ??
            new Error("There was an error while getting this attachment's URL")
        );
      },
      { delay: 50 }
    );
    return createBatchStore(batch);
  });

  function getOrCreateAttachmentUrlsStore(
    roomId: string
  ): BatchStore<string, string> {
    return attachmentUrlsBatchStoresByRoom.getOrCreate(roomId);
  }

  function getAttachmentUrl(options: { roomId: string; attachmentId: string }) {
    const batch = getOrCreateAttachmentUrlsStore(options.roomId).batch;
    return batch.get(options.attachmentId);
  }

  /* -------------------------------------------------------------------------------------------------
   * Attachments (Chat level)
   * -----------------------------------------------------------------------------------------------*/
  async function uploadChatAttachment(options: {
    chatId: string;
    attachment: {
      id: string;
      file: File;
    };
    signal?: AbortSignal;
  }): Promise<void> {
    const { chatId, attachment, signal } = options;
    const userId = currentUserId.get();
    if (userId === undefined) {
      throw new Error("Attachment upload requires an authenticated user.");
    }
    const ATTACHMENT_PART_SIZE = 5 * 1024 * 1024; // 5 MB

    if (options.attachment.file.size <= ATTACHMENT_PART_SIZE) {
      await httpClient.putBlob(
        url`/v2/c/chats/${chatId}/attachments/${attachment.id}/upload/${encodeURIComponent(attachment.file.name)}`,
        await authManager.getAuthValue({ requestedScope: "comments:read" }),
        attachment.file,
        { fileSize: attachment.file.size },
        { signal }
      );
    } else {
      const multipartUpload = await httpClient.post<{
        uploadId: string;
        key: string;
      }>(
        url`/v2/c/chats/${chatId}/attachments/${attachment.id}/multipart/${encodeURIComponent(attachment.file.name)}`,
        await authManager.getAuthValue({ requestedScope: "comments:read" }),
        undefined,
        { signal },
        { fileSize: attachment.file.size }
      );

      try {
        const uploadedParts: { etag: string; number: number }[] = [];

        const parts: { number: number; part: Blob }[] = [];
        let start = 0;
        while (start < attachment.file.size) {
          const end = Math.min(
            start + ATTACHMENT_PART_SIZE,
            attachment.file.size
          );
          parts.push({
            number: parts.length + 1,
            part: attachment.file.slice(start, end),
          });
          start = end;
        }

        uploadedParts.push(
          ...(await Promise.all(
            parts.map(async ({ number, part }) => {
              return await httpClient.putBlob<{
                etag: string;
                number: number;
              }>(
                url`/v2/c/chats/${chatId}/attachments/${attachment.id}/multipart/${multipartUpload.uploadId}/${String(number)}`,
                await authManager.getAuthValue({
                  requestedScope: "comments:read",
                }),
                part,
                undefined,
                { signal }
              );
            })
          ))
        );

        await httpClient.post(
          url`/v2/c/chats/${chatId}/attachments/${attachment.id}/multipart/${multipartUpload.uploadId}/complete`,
          await authManager.getAuthValue({ requestedScope: "comments:read" }),
          { parts: uploadedParts.sort((a, b) => a.number - b.number) },
          { signal }
        );
      } catch (err) {
        try {
          await httpClient.delete(
            url`/v2/c/chats/${chatId}/attachments/${attachment.id}/multipart/${multipartUpload.uploadId}`,
            await authManager.getAuthValue({ requestedScope: "comments:read" })
          );
        } catch (err) {
          // Ignore the error, we are probably offline
        }
        throw err;
      }
    }
  }

  const attachmentUrlsBatchStoresByChat = new DefaultMap<
    string,
    BatchStore<string, string>
  >((chatId) => {
    const batch = new Batch<string, string>(
      async (batchedAttachmentIds) => {
        const attachmentIds = batchedAttachmentIds.flat();
        const { urls } = await httpClient.post<{
          urls: (string | null)[];
        }>(
          url`/v2/c/chats/${chatId}/attachments/presigned-urls`,
          await authManager.getAuthValue({
            requestedScope: "comments:read",
          }),
          { attachmentIds }
        );

        return urls.map(
          (url) =>
            url ??
            new Error("There was an error while getting this attachment's URL")
        );
      },
      { delay: 50 }
    );
    return createBatchStore(batch);
  });

  function getOrCreateChatAttachmentUrlsStore(
    chatId: string
  ): BatchStore<string, string> {
    return attachmentUrlsBatchStoresByChat.getOrCreate(chatId);
  }

  function getChatAttachmentUrl(options: {
    chatId: string;
    attachmentId: string;
  }) {
    const batch = getOrCreateChatAttachmentUrlsStore(options.chatId).batch;
    return batch.get(options.attachmentId);
  }

  /* -------------------------------------------------------------------------------------------------
   * Notifications (Room level)
   * -----------------------------------------------------------------------------------------------*/
  async function getSubscriptionSettings(options: {
    roomId: string;
    signal?: AbortSignal;
  }): Promise<RoomSubscriptionSettings> {
    return httpClient.get<RoomSubscriptionSettings>(
      url`/v2/c/rooms/${options.roomId}/subscription-settings`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
      undefined,
      {
        signal: options.signal,
      }
    );
  }

  async function updateSubscriptionSettings(options: {
    roomId: string;
    settings: Partial<RoomSubscriptionSettings>;
  }): Promise<RoomSubscriptionSettings> {
    return httpClient.post<RoomSubscriptionSettings>(
      url`/v2/c/rooms/${options.roomId}/subscription-settings`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
      options.settings
    );
  }

  const markAsReadBatchesByRoom = new DefaultMap<string, Batch<string, string>>(
    (roomId) =>
      new Batch<string, string>(
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
            await authManager.getAuthValue({
              requestedScope: "comments:read",
              roomId,
            }),
            { inboxNotificationIds }
          );
          return inboxNotificationIds;
        },
        { delay: 50 }
      )
  );

  async function markRoomInboxNotificationAsRead(options: {
    roomId: string;
    inboxNotificationId: string;
  }) {
    const batch = markAsReadBatchesByRoom.getOrCreate(options.roomId);
    return batch.get(options.inboxNotificationId);
  }

  /* -------------------------------------------------------------------------------------------------
   * Text editor (Room level)
   * -----------------------------------------------------------------------------------------------*/
  async function createTextMention(options: {
    roomId: string;
    mentionId: string;
    mention: MentionData;
  }) {
    if (options.mention.kind !== "user" && options.mention.kind !== "group") {
      return assertNever(options.mention, "Unexpected mention kind");
    }

    await httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/text-mentions`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
      {
        userId:
          options.mention.kind === "user" ? options.mention.id : undefined,
        groupId:
          options.mention.kind === "group" ? options.mention.id : undefined,
        userIds:
          options.mention.kind === "group"
            ? options.mention.userIds
            : undefined,
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function getTextVersion(options: {
    roomId: string;
    versionId: string;
  }) {
    return httpClient.rawGet(
      url`/v2/c/rooms/${options.roomId}/y-version/${options.versionId}`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function createTextVersion(options: { roomId: string }) {
    await httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/version`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
    );
  }

  async function reportTextEditor(options: {
    roomId: string;
    type: TextEditorType;
    rootKey: string;
  }) {
    await httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/text-metadata`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
      {
        type: options.type,
        rootKey: options.rootKey,
      }
    );
  }

  async function executeContextualPrompt(options: {
    roomId: string;
    prompt: string;
    context: ContextualPromptContext;
    previous?: {
      prompt: string;
      response: ContextualPromptResponse;
    };
    signal: AbortSignal;
  }): Promise<string> {
    const result = await httpClient.post<{
      content: { type: "text"; text: string }[];
    }>(
      url`/v2/c/rooms/${options.roomId}/ai/contextual-prompt`,
      await authManager.getAuthValue({
        requestedScope: "room:read",
        roomId: options.roomId,
      }),
      {
        prompt: options.prompt,
        context: {
          beforeSelection: options.context.beforeSelection,
          selection: options.context.selection,
          afterSelection: options.context.afterSelection,
        },
        previous: options.previous,
      },
      { signal: options.signal }
    );
    if (!result || result.content.length === 0) {
      throw new Error("No content returned from server");
    }
    return result.content[0].text;
  }

  async function listTextVersions(options: { roomId: string }) {
    const result = await httpClient.get<{
      versions: DateToString<HistoryVersion>[];
      meta: {
        requestedAt: string;
      };
    }>(
      url`/v2/c/rooms/${options.roomId}/versions`,
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      })
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
      await authManager.getAuthValue({
        requestedScope: "comments:read",
        roomId: options.roomId,
      }),
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

  async function streamStorage(options: { roomId: string }) {
    const result = await httpClient.rawGet(
      url`/v2/c/rooms/${options.roomId}/storage`,
      await authManager.getAuthValue({
        requestedScope: "room:read",
        roomId: options.roomId,
      })
    );
    return (await result.json()) as IdTuple<SerializedCrdt>[];
  }

  async function sendMessagesOverHTTP<
    P extends JsonObject,
    E extends Json,
  >(options: {
    roomId: string;
    nonce: string | undefined;
    messages: ClientMsg<P, E>[];
  }) {
    return httpClient.rawPost(
      url`/v2/c/rooms/${options.roomId}/send-message`,
      await authManager.getAuthValue({
        requestedScope: "room:read",
        roomId: options.roomId,
      }),
      {
        nonce: options.nonce,
        messages: options.messages,
      }
    );
  }

  /* -------------------------------------------------------------------------------------------------
   * Inbox notifications (User-level)
   * -----------------------------------------------------------------------------------------------*/
  async function getInboxNotifications(options?: {
    cursor?: string;
    query?: { roomId?: string; kind?: string };
  }) {
    const PAGE_SIZE = 50;

    let query: string | undefined;

    if (options?.query) {
      query = objectToQuery(options.query);
    }

    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      subscriptions: SubscriptionDataPlain[];
      groups: GroupDataPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
      };
    }>(
      url`/v2/c/inbox-notifications`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      {
        cursor: options?.cursor,
        limit: PAGE_SIZE,
        query,
      }
    );

    const groups = json.groups.map(convertToGroupData);

    // Instead of being returned publicly, the user's groups are put in
    // a separate store which is also used for on-demand fetching.
    groupsStore.setData(groups.map((group) => [group.id, group]));

    return {
      inboxNotifications: json.inboxNotifications.map(
        convertToInboxNotificationData
      ),
      threads: json.threads.map(convertToThreadData),
      subscriptions: json.subscriptions.map(convertToSubscriptionData),
      nextCursor: json.meta.nextCursor,
      requestedAt: new Date(json.meta.requestedAt),
    };
  }

  async function getInboxNotificationsSince(options: {
    since: Date;
    query?: { roomId?: string; kind?: string };
    signal?: AbortSignal;
  }) {
    let query: string | undefined;

    if (options?.query) {
      query = objectToQuery(options.query);
    }

    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      subscriptions: SubscriptionDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      deletedSubscriptions: SubscriptionDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>(
      url`/v2/c/inbox-notifications/delta`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      { since: options.since.toISOString(), query },
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
      subscriptions: {
        updated: json.subscriptions.map(convertToSubscriptionData),
        deleted: json.deletedSubscriptions.map(convertToSubscriptionDeleteInfo),
      },
      requestedAt: new Date(json.meta.requestedAt),
    };
  }

  async function getUnreadInboxNotificationsCount(options: {
    query?: {
      roomId?: string;
      kind?: string;
    };
    signal?: AbortSignal;
  }) {
    let query: string | undefined;

    if (options?.query) {
      query = objectToQuery(options.query);
    }

    const { count } = await httpClient.get<{ count: number }>(
      url`/v2/c/inbox-notifications/count`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      { query },
      { signal: options?.signal }
    );
    return count;
  }

  async function markAllInboxNotificationsAsRead() {
    await httpClient.post(
      url`/v2/c/inbox-notifications/read`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      {
        inboxNotificationIds: "all",
      }
    );
  }

  async function markInboxNotificationsAsRead(inboxNotificationIds: string[]) {
    await httpClient.post(
      url`/v2/c/inbox-notifications/read`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
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
      await authManager.getAuthValue({ requestedScope: "comments:read" })
    );
  }

  async function deleteInboxNotification(inboxNotificationId: string) {
    await httpClient.delete(
      url`/v2/c/inbox-notifications/${inboxNotificationId}`,
      await authManager.getAuthValue({ requestedScope: "comments:read" })
    );
  }

  /* -------------------------------------------------------------------------------------------------
   * Notifications settings (Project level)
   * -------------------------------------------------------------------------------------------------
   */
  async function getNotificationSettings(options?: {
    signal?: AbortSignal;
  }): Promise<NotificationSettingsPlain> {
    return httpClient.get<NotificationSettingsPlain>(
      url`/v2/c/notification-settings`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      undefined,
      { signal: options?.signal }
    );
  }

  async function updateNotificationSettings(
    settings: PartialNotificationSettings
  ): Promise<NotificationSettingsPlain> {
    return httpClient.post<NotificationSettingsPlain>(
      url`/v2/c/notification-settings`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      settings
    );
  }

  /* -------------------------------------------------------------------------------------------------
   * User threads
   * -------------------------------------------------------------------------------------------------
   */
  async function getUserThreads_experimental(options?: {
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
      subscriptions: SubscriptionDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      deletedSubscriptions: SubscriptionDeleteInfoPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
        permissionHints: Record<string, Permission[]>;
      };
    }>(
      url`/v2/c/threads`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      {
        cursor: options?.cursor,
        query,
        limit: PAGE_SIZE,
      }
    );

    return {
      threads: json.threads.map(convertToThreadData),
      inboxNotifications: json.inboxNotifications.map(
        convertToInboxNotificationData
      ),
      subscriptions: json.subscriptions.map(convertToSubscriptionData),
      nextCursor: json.meta.nextCursor,
      requestedAt: new Date(json.meta.requestedAt),
      permissionHints: json.meta.permissionHints,
    };
  }

  async function getUserThreadsSince_experimental<
    M extends BaseMetadata,
  >(options: { since: Date; signal?: AbortSignal }) {
    const json = await httpClient.get<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      subscriptions: SubscriptionDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      deletedSubscriptions: SubscriptionDeleteInfoPlain[];
      meta: {
        requestedAt: string;
        permissionHints: Record<string, Permission[]>;
      };
    }>(
      url`/v2/c/threads/delta`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
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
      subscriptions: {
        updated: json.subscriptions.map(convertToSubscriptionData),
        deleted: json.deletedSubscriptions.map(convertToSubscriptionDeleteInfo),
      },
      requestedAt: new Date(json.meta.requestedAt),
      permissionHints: json.meta.permissionHints,
    };
  }

  /* -------------------------------------------------------------------------------------------------
   * Groups
   * -------------------------------------------------------------------------------------------------
   */

  const batchedGetGroups = new Batch(
    async (batchedGroupIds: string[]) => {
      const groupIds = batchedGroupIds.flat();
      const { groups: plainGroups } = await httpClient.post<{
        groups: GroupDataPlain[];
      }>(
        url`/v2/c/groups/find`,
        await authManager.getAuthValue({
          requestedScope: "comments:read",
        }),
        { groupIds }
      );

      const groups = new Map<string, GroupData>();

      for (const group of plainGroups) {
        groups.set(group.id, convertToGroupData(group));
      }

      return groupIds.map((groupId) => groups.get(groupId));
    },
    { delay: 50 }
  );
  const groupsStore = createBatchStore(batchedGetGroups);

  function getGroup(groupId: string) {
    return batchedGetGroups.get(groupId);
  }

  /* -------------------------------------------------------------------------------------------------
   * URL metadata
   * -------------------------------------------------------------------------------------------------
   */
  async function getUrlMetadata(_url: string) {
    const result = await httpClient.get<UrlMetadata>(
      url`/v2/c/urls/metadata`,
      await authManager.getAuthValue({ requestedScope: "comments:read" }),
      { url: _url }
    );

    return result;
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
    subscribeToThread,
    unsubscribeFromThread,
    markRoomInboxNotificationAsRead,
    // Room subscription settings
    getSubscriptionSettings,
    updateSubscriptionSettings,
    // Room text editor
    createTextMention,
    deleteTextMention,
    getTextVersion,
    createTextVersion,
    reportTextEditor,
    listTextVersions,
    listTextVersionsSince,
    // Room attachments
    getAttachmentUrl,
    uploadAttachment,
    getOrCreateAttachmentUrlsStore,
    // User attachments
    uploadChatAttachment,
    getOrCreateChatAttachmentUrlsStore,
    getChatAttachmentUrl,
    // Room storage
    streamStorage,
    sendMessagesOverHTTP,
    // Notifications
    getInboxNotifications,
    getInboxNotificationsSince,
    getUnreadInboxNotificationsCount,
    markAllInboxNotificationsAsRead,
    markInboxNotificationAsRead,
    deleteAllInboxNotifications,
    deleteInboxNotification,
    getNotificationSettings,
    updateNotificationSettings,
    // User threads
    getUserThreads_experimental,
    getUserThreadsSince_experimental,
    // Groups
    groupsStore,
    getGroup,
    // AI
    executeContextualPrompt,
    // URL metadata
    getUrlMetadata,
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
  #baseUrl: string;
  #fetchPolyfill: typeof fetch;

  constructor(baseUrl: string, fetchPolyfill: typeof fetch) {
    this.#baseUrl = baseUrl;
    this.#fetchPolyfill = fetchPolyfill;
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
  async #rawFetch(
    endpoint: URLSafeString,
    authValue: AuthValue,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<Response> {
    if (!endpoint.startsWith("/v2/c/")) {
      raise("This client can only be used to make /v2/c/* requests");
    }

    const url = urljoin(this.#baseUrl, endpoint, params);
    return await this.#fetchPolyfill(url, {
      ...options,
      headers: {
        // These headers are default, but can be overriden by custom headers
        "Content-Type": "application/json; charset=utf-8",

        // Possible header overrides
        ...options?.headers,

        // Cannot be overriden by custom headers
        Authorization: `Bearer ${getBearerTokenFromAuthValue(authValue)}`,
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
  async #fetch<T extends JsonObject>(
    endpoint: URLSafeString,
    authValue: AuthValue,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    const response = await this.#rawFetch(endpoint, authValue, options, params);

    if (!response.ok) {
      throw await HttpError.fromResponse(response);
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
    authValue: AuthValue,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<Response> {
    return await this.#rawFetch(endpoint, authValue, options, params);
  }

  /**
   * Makes a POST request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .post() instead.
   */
  public async rawPost(
    endpoint: URLSafeString,
    authValue: AuthValue,
    body?: JsonObject
  ): Promise<Response> {
    return await this.#rawFetch(endpoint, authValue, {
      method: "POST",
      body: stringify(body),
    });
  }

  /**
   * Makes a DELETE request and returns the raw response.
   * Won't throw if the reponse is a non-2xx.
   * @deprecated Ideally, use .delete() instead.
   */
  public async rawDelete(
    endpoint: URLSafeString,
    authValue: AuthValue
  ): Promise<Response> {
    return await this.#rawFetch(endpoint, authValue, { method: "DELETE" });
  }

  /**
   * Makes a GET request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async get<T extends JsonObject>(
    endpoint: URLSafeString,
    authValue: AuthValue,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<T> {
    return await this.#fetch<T>(endpoint, authValue, options, params);
  }

  /**
   * Makes a POST request, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async post<T extends JsonObject>(
    endpoint: URLSafeString,
    authValue: AuthValue,
    body?: JsonObject,
    options?: Omit<RequestInit, "body" | "method" | "headers">,
    params?: QueryParams
  ): Promise<T> {
    return await this.#fetch<T>(
      endpoint,
      authValue,
      {
        ...options,
        method: "POST",
        body: stringify(body),
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
    authValue: AuthValue
  ): Promise<T> {
    return await this.#fetch<T>(endpoint, authValue, { method: "DELETE" });
  }

  /**
   * Makes a PUT request for a Blob body, and return the JSON response.
   * Will throw if the reponse is a non-2xx.
   */
  public async putBlob<T extends JsonObject>(
    endpoint: URLSafeString,
    authValue: AuthValue,
    blob?: Blob,
    params?: QueryParams,
    options?: Omit<RequestInit, "body" | "method" | "headers">
  ): Promise<T> {
    return await this.#fetch<T>(
      endpoint,
      authValue,
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
