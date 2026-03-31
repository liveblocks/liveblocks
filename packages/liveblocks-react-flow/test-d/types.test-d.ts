/* eslint-disable */

import type { LiveList, LiveObject, LsonObject } from "@liveblocks/core";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import { expectAssignable } from "tsd";

import type { LiveblocksEdge, LiveblocksNode } from "@liveblocks/react-flow";

type CustomData = {
  string: string;
  number?: number;
  array: string[];
  atomic: { x: number; y: number };
  nested: {
    string: string;
    atomic?: { x: number; y: number };
    nested: {
      array: string[];
    };
  };
};

type CustomNode = Node<CustomData, "custom-node">;
type CustomEdge = Edge<CustomData, "custom-edge">;

declare const node: LiveblocksNode<CustomNode>;
declare const edge: LiveblocksEdge<CustomEdge>;

type ExpectedCustomData = LiveObject<{
  string: string;
  number?: number;
  array: LiveList<string>;
  atomic: LiveObject<{ x: number; y: number }>;
  nested: LiveObject<{
    string: string;
    atomic?: LiveObject<{ x: number; y: number }>;
    nested: LiveObject<{
      array: LiveList<string>;
    }>;
  }>;
}>;

/**
 * LiveblocksNode
 */
{
  // It is a LiveObject
  expectAssignable<LiveObject<LsonObject>>(node);

  // Its fields get liveified, for example:
  // - `style?: { ... }` becomes `style?: LiveObject<{ ... }>`
  // - `id: string` is a scalar so it remains unchanged
  expectAssignable<LiveObject<LsonObject> | undefined>(node.get("style"));
  expectAssignable<string>(node.get("id"));

  // Based on NODE_BASE_CONFIG, some fields are treated either as local-only or as atomic:
  // - `selected: boolean` is marked as local-only so it becomes `boolean | undefined`
  // - `position: XYPosition` is marked as atomic so it stays as `XYPosition` instead of becoming `LiveObject<{ x: number; y: number }>`
  expectAssignable<boolean | undefined>(node.get("selected"));
  expectAssignable<XYPosition>(node.get("position"));

  // Its data field is deeply livified.
  expectAssignable<ExpectedCustomData>(node.get("data"));
}

/**
 * LiveblocksEdge
 */
{
  // It is a LiveObject
  expectAssignable<LiveObject<LsonObject>>(edge);

  // Its fields get liveified, for example:
  // - `style?: { ... }` becomes `style?: LiveObject<{ ... }>`
  // - `id: string` is a scalar so it remains unchanged
  expectAssignable<LiveObject<LsonObject> | undefined>(edge.get("style"));
  expectAssignable<string>(edge.get("id"));

  // Based on EDGE_BASE_CONFIG, some fields are treated either as local-only or as atomic:
  // - `selected: boolean` is marked as local-only so it becomes `boolean | undefined`
  // - `labelBgPadding?: [number, number]` is marked as atomic so it stays as `[number, number]` instead of becoming `LiveList<number>`
  expectAssignable<boolean | undefined>(edge.get("selected"));
  expectAssignable<[number, number] | undefined>(edge.get("labelBgPadding"));

  // Its data field (optional on edges) is deeply livified.
  expectAssignable<ExpectedCustomData | undefined>(edge.get("data"));
}
