import type { BaseMetadata, ThreadData } from "@liveblocks/client";
import { isStartsWithOperator } from "@liveblocks/core";

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
  op: Exclude<BaseMetadata[string], undefined> | { startsWith: string } | null
) {
  if (op === null) {
    // If the operator is `null`, we're doing an explicit query for absence
    return value === undefined;
  } else if (isStartsWithOperator(op)) {
    return typeof value === "string" && value.startsWith(op.startsWith);
  } else {
    return value === op;
  }
}
