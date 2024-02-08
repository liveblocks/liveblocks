import type { AuthManager } from "./auth-manager";
import type { InboxNotificationsApi } from "./client";
import {
  getAuthBearerHeaderFromAuthValue,
  NotificationsApiError,
} from "./client";
import {
  convertToInboxNotificationData,
  convertToThreadData,
} from "./convert-plain-data";
import { Batch } from "./lib/batch";
import type { Store } from "./lib/create-store";
import { TokenKind } from "./protocol/AuthToken";
import type { InboxNotificationDataPlain } from "./types/InboxNotificationData";
import type { ThreadDataPlain } from "./types/ThreadData";

const MARK_INBOX_NOTIFICATIONS_AS_READ_BATCH_DELAY = 50;

export type GetInboxNotificationsOptions = {
  limit?: number;
};

export function createInboxNotificationsApi({
  baseUrl,
  authManager,
  currentUserIdStore,
  fetcher,
}: {
  baseUrl: string;
  authManager: AuthManager;
  currentUserIdStore: Store<string | null>;
  fetcher: (url: string, init?: RequestInit) => Promise<Response>;
}): InboxNotificationsApi {
  async function fetchJson<T>(
    endpoint: string,
    options?: RequestInit
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

    const url = new URL(`/v2/c${endpoint}`, baseUrl);
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
    const queryParams = toURLSearchParams({ limit: options?.limit });
    const json = await fetchJson<{
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
