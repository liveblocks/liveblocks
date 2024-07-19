// Inlined version of 3.3.7 of nanoid.js
// https://www.npmjs.com/package/nanoid/v/3.3.7?activeTab=code
const nanoid = (t = 21) =>
  crypto
    .getRandomValues(new Uint8Array(t))
    .reduce(
      (t, e) =>
        (t +=
          (e &= 63) < 36
            ? e.toString(36)
            : e < 62
              ? (e - 26).toString(36).toUpperCase()
              : e < 63
                ? "_"
                : "-"),
      ""
    );

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
