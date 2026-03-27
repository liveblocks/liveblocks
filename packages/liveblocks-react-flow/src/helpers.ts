import type { Json } from "@liveblocks/core";
import { deepLiveify, LiveObject } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

import {
  EDGE_ATOMIC_KEYS,
  EDGE_LOCAL_KEYS,
  NODE_ATOMIC_KEYS,
  NODE_LOCAL_KEYS,
} from "./constants";
import type { LiveblocksEdge, LiveblocksNode } from "./types";

/**
 * @experimental
 *
 * Converts a React Flow `Node` into a Liveblocks Storage version, omitting
 * the fields that must stay local to each client.
 */
// XXX Eventually™, this can become:
//
// deepLiveifyObject(
//   node,
//   {
//     // Don't sync these
//     selected: false,
//     dragging: false,
//     measured: false,
//     resizing: false,
//
//     // Don't deep-livify these
//     size: "atomic",
//     position: "atomic",
//
//     ...
//     data, // literally whatever the user provided via the sync config for this node type
//   }
// )
//
export function toLiveblocksNode<N extends Node>(node: N): LiveblocksNode<N> {
  const liveNode = new LiveObject() as LiveblocksNode<N>;

  // XXX You can see the shape of deepLiveifyObject() + config emerging here
  for (const key in node) {
    const value = node[key];
    if (value === undefined) continue;

    if (NODE_LOCAL_KEYS.has(key)) {
      // @ts-expect-error XXX Fix this later
      liveNode.setLocal(key, value);
    } else if (NODE_ATOMIC_KEYS.has(key)) {
      // @ts-expect-error XXX Fix this later
      liveNode.set(key, value as Json);
    } else {
      // @ts-expect-error XXX Fix this later
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call
      liveNode.set(key, deepLiveify(value as Json));
    }
  }

  return liveNode;
}

/**
 * @experimental
 *
 * Converts a React Flow `Edge` into a Liveblocks Storage version, omitting
 * the fields that must stay local to each client.
 */
// XXX Eventually™, this can become:
//
// deepLiveifyObject(
//   edge,
//   {
//     // Don't sync these
//     selected: false,
//
//     data, // literally whatever the user provided via the sync config for this edge type
//   }
// )
//
export function toLiveblocksEdge<E extends Edge>(edge: E): LiveblocksEdge<E> {
  const liveEdge = new LiveObject() as LiveblocksEdge<E>;

  for (const key in edge) {
    const value = edge[key];
    if (value === undefined) continue;

    if (EDGE_LOCAL_KEYS.has(key)) {
      // @ts-expect-error XXX Fix this later
      liveEdge.setLocal(key, value);
    } else if (EDGE_ATOMIC_KEYS.has(key)) {
      // @ts-expect-error XXX Fix this later
      liveEdge.set(key, value as Json);
    } else {
      // @ts-expect-error XXX Fix this later
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call
      liveEdge.set(key, deepLiveify(value as Json));
    }
  }

  return liveEdge;
}
