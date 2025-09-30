import type {
  BaseMetadata,
  InboxNotificationData,
  ThreadData,
} from "@liveblocks/client";
import {
  getSubscriptionKey,
  isNumberOperator,
  isStartsWithOperator,
} from "@liveblocks/core";

import type { InboxNotificationsQuery, ThreadsQuery } from "../types";
import type { SubscriptionsByKey } from "../umbrella-store";

/**
 * Creates a predicate function that will filter all ThreadData instances that
 * match the given query.
 */
export function makeThreadsFilter<M extends BaseMetadata>(
  query: ThreadsQuery<M>,
  subscriptions: SubscriptionsByKey | undefined
): (thread: ThreadData<M>) => boolean {
  return (thread: ThreadData<M>) =>
    matchesThreadsQuery(thread, query, subscriptions) &&
    matchesMetadata(thread, query);
}

function matchesThreadsQuery(
  thread: ThreadData<BaseMetadata>,
  q: ThreadsQuery<BaseMetadata>,
  subscriptions: SubscriptionsByKey | undefined
) {
  // Boolean logic: query.resolved? => q.resolved === t.resolved
  const subscription = subscriptions?.[getSubscriptionKey("thread", thread.id)];

  return (
    (q.resolved === undefined || thread.resolved === q.resolved) &&
    (q.subscribed === undefined ||
      (q.subscribed === true && subscription !== undefined) ||
      (q.subscribed === false && subscription === undefined))
  );
}

function matchesMetadata(
  thread: ThreadData<BaseMetadata>,
  q: ThreadsQuery<BaseMetadata>
) {
  // Boolean logic: query.metadata? => all metadata matches
  const metadata = thread.metadata;
  return (
    q.metadata === undefined ||
    Object.entries(q.metadata).every(
      ([key, op]) =>
        // Ignore explicit-undefined filters
        // Boolean logic: op? => value matches the operator
        op === undefined || matchesOperator(metadata[key], op)
    )
  );
}

function matchesOperator(
  value: BaseMetadata[string],
  op:
    | Exclude<BaseMetadata[string], undefined>
    | { startsWith: string }
    | {
        lt?: number;
        gt?: number;
        lte?: number;
        gte?: number;
      }
    | null
) {
  if (op === null) {
    // If the operator is `null`, we're doing an explicit query for absence
    return value === undefined;
  } else if (isStartsWithOperator(op)) {
    return typeof value === "string" && value.startsWith(op.startsWith);
  } else if (isNumberOperator(op)) {
    return typeof value === "number" && matchesNumberOperator(value, op);
  } else {
    return value === op;
  }
}

function matchesNumberOperator(
  value: number,
  op: {
    lt?: number;
    gt?: number;
    lte?: number;
    gte?: number;
  }
) {
  return (
    (op.lt === undefined || value < op.lt) &&
    (op.gt === undefined || value > op.gt) &&
    (op.lte === undefined || value <= op.lte) &&
    (op.gte === undefined || value >= op.gte)
  );
}

export function makeInboxNotificationsFilter(
  query: InboxNotificationsQuery
): (inboxNotification: InboxNotificationData) => boolean {
  return (inboxNotification: InboxNotificationData) =>
    matchesInboxNotificationsQuery(inboxNotification, query);
}

function matchesInboxNotificationsQuery(
  inboxNotification: InboxNotificationData,
  q: InboxNotificationsQuery
) {
  return (
    (q.roomId === undefined || q.roomId === inboxNotification.roomId) &&
    (q.kind === undefined || q.kind === inboxNotification.kind)
  );
}
