import type { AuthManager } from "./auth-manager";
import type { NotificationsApi } from "./client";
import {
  getAuthBearerHeaderFromAuthValue,
  NotificationsApiError,
} from "./client";
import {
  convertToInboxNotificationData,
  convertToInboxNotificationDeleteInfo,
  convertToThreadData,
  convertToThreadDeleteInfo,
} from "./convert-plain-data";
import { Batch } from "./lib/batch";
import type { Store } from "./lib/create-store";
import { type QueryParams, urljoin } from "./lib/url";
import { TokenKind } from "./protocol/AuthToken";
import type {
  BaseMetadata,
  ThreadDataPlain,
  ThreadDeleteInfoPlain,
} from "./protocol/Comments";
import type {
  InboxNotificationDataPlain,
  InboxNotificationDeleteInfoPlain,
} from "./protocol/InboxNotifications";

const MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY = 50;

export type GetInboxNotificationsOptions = {
  limit?: number;
  since?: Date;
};

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
}): NotificationsApi<M> {
  async function fetchJson<T>(
    endpoint: string,
    options?: RequestInit,
    params?: QueryParams
  ): Promise<T> {
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

    const url = urljoin(baseUrl, `/v2/c${endpoint}`, params);
    const response = await fetcher(url.toString(), {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getAuthBearerHeaderFromAuthValue(authValue)}`,
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

  async function getInboxNotifications(options?: GetInboxNotificationsOptions) {
    const json = await fetchJson<{
      threads: ThreadDataPlain<M>[];
      inboxNotifications: InboxNotificationDataPlain[];
      deletedThreads: ThreadDeleteInfoPlain[];
      deletedInboxNotifications: InboxNotificationDeleteInfoPlain[];
      meta: {
        requestedAt: string;
      };
    }>("/inbox-notifications", undefined, {
      limit: options?.limit,
      since: options?.since?.toISOString(),
    });

    return {
      threads: json.threads.map((thread) => convertToThreadData(thread)),
      inboxNotifications: json.inboxNotifications.map((notification) =>
        convertToInboxNotificationData(notification)
      ),
      deletedThreads: json.deletedThreads.map((info) =>
        convertToThreadDeleteInfo(info)
      ),
      deletedInboxNotifications: json.deletedInboxNotifications.map((info) =>
        convertToInboxNotificationDeleteInfo(info)
      ),
      meta: {
        requestedAt: new Date(json.meta.requestedAt),
      },
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

  const batchedMarkInboxNotificationsAsRead = new Batch<string, string>(
    async (batchedInboxNotificationIds) => {
      const inboxNotificationIds = batchedInboxNotificationIds.flat();

      await markInboxNotificationsAsRead(inboxNotificationIds);

      return inboxNotificationIds;
    },
    { delay: MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY }
  );

  async function markInboxNotificationAsRead(inboxNotificationId: string) {
    await batchedMarkInboxNotificationsAsRead.get(inboxNotificationId);
  }

  async function deleteAllInboxNotifications() {
    await fetchJson("/inbox-notifications", {
      method: "DELETE",
    });
  }

  async function deleteInboxNotification(inboxNotificationId: string) {
    await fetchJson(
      `/inbox-notifications/${encodeURIComponent(inboxNotificationId)}`,
      {
        method: "DELETE",
      }
    );
  }

  return {
    getInboxNotifications,
    getUnreadInboxNotificationsCount,
    markAllInboxNotificationsAsRead,
    markInboxNotificationAsRead,
    deleteAllInboxNotifications,
    deleteInboxNotification,
  };
}
