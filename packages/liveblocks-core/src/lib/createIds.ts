import { nanoid } from "./nanoid";

const THREAD_ID_PREFIX = "th";
const COMMENT_ID_PREFIX = "cm";
const INBOX_NOTIFICATION_ID_PREFIX = "in";

function createOptimisticId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

export function createThreadId(): string {
  return createOptimisticId(THREAD_ID_PREFIX);
}

export function createCommentId(): string {
  return createOptimisticId(COMMENT_ID_PREFIX);
}

export function createInboxNotificationId(): string {
  return createOptimisticId(INBOX_NOTIFICATION_ID_PREFIX);
}
