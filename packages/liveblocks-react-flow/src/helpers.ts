import { LiveObject, type LsonObject } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

import { EDGE_LOCAL_KEYS, NODE_LOCAL_KEYS } from "./constants";
import type { LiveblocksEdge, LiveblocksNode } from "./types";

function omit<T extends object, K extends PropertyKey>(
  from: T,
  keys: readonly K[]
): Omit<T, Extract<K, keyof T>> {
  const result = { ...from } as Partial<T>;

  for (const key of keys) {
    delete (result as Record<PropertyKey, unknown>)[key];
  }

  return result as Omit<T, Extract<K, keyof T>>;
}

/**
 * @experimental
 *
 * Converts a React Flow `Node` into a Liveblocks Storage version, omitting
 * the fields that must stay local to each client.
 */
export function toLiveblocksNode<N extends Node>(node: N): LiveblocksNode<N> {
  const { data, ...rest } = omit(node, NODE_LOCAL_KEYS) as N;

  return new LiveObject({
    ...(rest as LsonObject),
    data: new LiveObject(data as LsonObject),
  }) as LiveblocksNode<N>;
}

/**
 * @experimental
 *
 * Converts a React Flow `Edge` into a Liveblocks Storage version, omitting
 * the fields that must stay local to each client.
 */
export function toLiveblocksEdge<E extends Edge>(edge: E): LiveblocksEdge<E> {
  const { data, ...rest } = omit(edge, EDGE_LOCAL_KEYS) as E;

  return new LiveObject({
    ...(rest as LsonObject),

    // `data` is optional on edges.
    data: data === undefined ? undefined : new LiveObject(data as LsonObject),
  }) as LiveblocksEdge<E>;
}
