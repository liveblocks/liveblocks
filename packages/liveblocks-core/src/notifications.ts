import { type GetThreadsOptions, objectToQuery } from ".";
import type { AuthManager } from "./auth-manager";
import type { NotificationsApi } from "./client";
import { NotificationsApiError } from "./client";
import {
  convertToInboxNotificationData,
  convertToInboxNotificationDeleteInfo,
  convertToThreadData,
  convertToThreadDeleteInfo,
} from "./convert-plain-data";
import { getBearerTokenFromAuthValue } from "./http-client";
import { Batch } from "./lib/batch";
import type { Store } from "./lib/create-store";
import type { QueryParams, URLSafeString } from "./lib/url";
import { url, urljoin } from "./lib/url";
import { raise } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type {
  BaseMetadata,
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
import type { GetThreadsSinceOptions } from "./room";
import { PKG_VERSION } from "./version";

export function createNotificationsApi<M extends BaseMetadata>({
  baseUrl,
  authManager,
  currentUserIdStore,
  fetcher,
}: {
  baseUrl: string;
  authManager: AuthManager;
  currentUserIdStore: Store<string | null>;
  fetcher: (url: string, init?: RequestInit) => Promise<Response>;
}): NotificationsApi<M> & {
  getUserThreads_experimental(options?: GetThreadsOptions<M>): Promise<{
    threads: ThreadData<M>[];
    inboxNotifications: InboxNotificationData[];
    nextCursor: string | null;
    requestedAt: Date;
  }>;
  getUserThreadsSince_experimental(options: GetThreadsSinceOptions): Promise<{
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
} {
  async function fetchJson<T>(
    endpoint: URLSafeString,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
    if (!endpoint.startsWith("/v2/c/")) {
      raise("Expected a /v2/c/* endpoint");
    }

    const authValue = await authManager.getAuthValue({
      requestedScope: "comments:read",
    });

    if (
      authValue.type === "secret" &&
      authValue.token.parsed.k === TokenKind.ACCESS_TOKEN
    ) {
      const userId = authValue.token.parsed.uid;
      currentUserIdStore.set(() => userId);
    }

    const url = urljoin(baseUrl, endpoint, params);
    const response = await fetcher(url.toString(), {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getBearerTokenFromAuthValue(authValue)}`,
        "X-LB-Client": PKG_VERSION || "dev",
      },
    });

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

  async function getInboxNotifications(options?: { cursor?: string }) {
    const PAGE_SIZE = 6; // XXX TODO Maybe bump to 50?

    const json = await fetchJson<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
      };
    }>(url`/v2/c/inbox-notifications`, undefined, {
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

  async function getInboxNotificationsSince(since: Date) {
    const json = await fetchJson<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>(url`/v2/c/inbox-notifications/delta`, undefined, {
      since: since.toISOString(),
    });
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
    const { count } = await fetchJson<{
      count: number;
    }>(url`/v2/c/inbox-notifications/count`);

    return count;
  }

  async function markAllInboxNotificationsAsRead() {
    await fetchJson(url`/v2/c/inbox-notifications/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inboxNotificationIds: "all" }),
    });
  }

  async function markInboxNotificationsAsRead(inboxNotificationIds: string[]) {
    await fetchJson(url`/v2/c/inbox-notifications/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inboxNotificationIds }),
    });
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
    await fetchJson(url`/v2/c/inbox-notifications`, {
      method: "DELETE",
    });
  }

  async function deleteInboxNotification(inboxNotificationId: string) {
    await fetchJson(url`/v2/c/inbox-notifications/${inboxNotificationId}`, {
      method: "DELETE",
    });
  }

  async function getUserThreads_experimental(options: GetThreadsOptions<M>) {
    let query: string | undefined;

    if (options?.query) {
      query = objectToQuery(options.query);
    }

    const PAGE_SIZE = 2; // XXX TODO: Bump this to a reasonable number

    const json = await fetchJson<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
        nextCursor: string | null;
      };
    }>(url`/v2/c/threads`, undefined, {
      cursor: options.cursor,
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

  async function getUserThreadsSince_experimental(
    options: GetThreadsSinceOptions
  ) {
    const json = await fetchJson<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>(url`/v2/c/threads`, undefined, {
      since: options.since.toISOString(),
    });

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
    getInboxNotifications,
    getInboxNotificationsSince,
    getUnreadInboxNotificationsCount,
    markAllInboxNotificationsAsRead,
    markInboxNotificationAsRead,
    deleteAllInboxNotifications,
    deleteInboxNotification,
    getUserThreads_experimental,
    getUserThreadsSince_experimental,
  };
}
