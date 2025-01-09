import type { BaseMetadata, ThreadData } from "@liveblocks/client";
import { isStartsWith } from "@liveblocks/core";

import type { ThreadsQuery } from "../types";

/**
 * Creates a predicate function that will filter all ThreadData instances that
 * match the given query.
 */
export function makeThreadsFilter<M extends BaseMetadata>(
  query: ThreadsQuery<M>
): (thread: ThreadData<M>) => boolean {
  return (thread: ThreadData<M>) =>
    matchesQuery(thread, query) && matchesMetadata(thread, query);
}

function matchesQuery(
  thread: ThreadData<BaseMetadata>,
  q: ThreadsQuery<BaseMetadata>
) {
  // Boolean logic: query.resolved? => q.resolved === t.resolved
  return q.resolved === undefined || thread.resolved === q.resolved;
}

function matchesMetadata(
  thread: ThreadData<BaseMetadata>,
  q: ThreadsQuery<BaseMetadata>
) {
  // Boolean logic: query.metadata? => all metadata matches
  const metadata = thread.metadata;
  return (
    q.metadata === undefined ||
    Object.entries(q.metadata).every(([key, op]) =>
      // NOTE: `op` can be explicitly-`undefined` here, which ideally would not
      // mean "filter for absence" like it does now, as this does not match the
      // backend behavior at the moment. For an in-depth discussion, see
      // https://liveblocks.slack.com/archives/C02PZL7QAAW/p1728546988505989
      matchesOperator(metadata[key], op)
    )
  );
}

function matchesOperator(
  value: BaseMetadata[string],
  // NOTE: Ideally, this should not take `undefined` as a possible `op` value
  // here, see comment above.
  op: BaseMetadata[string] | { startsWith: string } | undefined
) {
  if (isStartsWith(op)) {
    return typeof value === "string" && value.startsWith(op.startsWith);
  } else {
    return value === op;
  }
}
