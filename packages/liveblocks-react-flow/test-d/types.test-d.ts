/* eslint-disable */

import type {
  LiveList,
  LiveMap,
  LiveObject,
  LsonObject,
} from "@liveblocks/core";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import { expectAssignable, expectType } from "tsd";

import type {
  LiveblocksEdge,
  LiveblocksFlow,
  LiveblocksNode,
} from "@liveblocks/react-flow";

type CustomData = {
  string: string;
  number?: number;
  array: string[];
  object: { x: number; y: number };
  nested: {
    string: string;
    object?: { x: number; y: number };
    nested: {
      array: string[];
    };
  };
};

type CustomNode = Node<CustomData, "custom-node">;

type CustomEdge = Edge<CustomData, "custom-edge">;

/**
 * LiveblocksNode
 */
{
  const node = {} as LiveblocksNode<CustomNode>;

  // It is a LiveObject
  expectAssignable<LiveObject<LsonObject>>(node);

  // Its fields get liveified, for example:
  // - `style?: { ... }` becomes `style?: LiveObject<{ ... }>`
  // - `id: string` is a scalar so it remains unchanged
  expectAssignable<LiveObject<LsonObject> | undefined>(node.get("style"));
  expectType<string>(node.get("id"));

  // Based on NODE_BASE_CONFIG, some fields are treated either as local-only or as atomic:
  // - `selected: boolean` is marked as local-only so it becomes `boolean | undefined`
  // - `position: XYPosition` is marked as atomic so it stays as `XYPosition` instead of becoming `LiveObject<{ x: number; y: number }>`
  expectType<boolean | undefined>(node.get("selected"));
  expectType<XYPosition>(node.get("position"));

  expectAssignable<LiveObject<LsonObject>>(node.get("data"));
  expectType<string>(node.get("data").get("string"));
  expectType<number | undefined>(node.get("data").get("number"));
  expectAssignable<LiveList<string>>(node.get("data").get("array"));
  expectAssignable<LiveObject<LsonObject>>(node.get("data").get("nested"));
  expectAssignable<LiveObject<LsonObject>>(
    node.get("data").get("nested").get("nested")!
  );
}

/**
 * LiveblocksNode with a custom sync config
 */
{
  const node = {} as LiveblocksNode<
    CustomNode,
    { object: "atomic"; array: false; nested: { nested: false } }
  >;

  expectAssignable<LiveObject<LsonObject>>(node.get("data"));
  expectType<string>(node.get("data").get("string"));
  expectType<number | undefined>(node.get("data").get("number"));
  expectAssignable<{ x: number; y: number }>(node.get("data").get("object"));
  expectAssignable<string[] | undefined>(node.get("data").get("array"));
  expectAssignable<LiveObject<LsonObject>>(node.get("data").get("nested"));
  expectType<string>(node.get("data").get("nested").get("string"));
}

/**
 * LiveblocksEdge
 */
{
  const edge = {} as LiveblocksEdge<CustomEdge>;

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

  expectAssignable<LiveObject<LsonObject> | undefined>(edge.get("data"));
  expectType<string>(edge.get("data")!.get("string"));
  expectType<number | undefined>(edge.get("data")!.get("number"));
  expectAssignable<LiveList<string>>(edge.get("data")!.get("array"));
  expectAssignable<LiveObject<LsonObject>>(edge.get("data")!.get("nested"));
  expectAssignable<LiveObject<LsonObject>>(
    edge.get("data")!.get("nested").get("nested")!
  );
}

/**
 * LiveblocksEdge with a custom sync config
 */
{
  const edge = {} as LiveblocksEdge<
    CustomEdge,
    { object: "atomic"; array: false; nested: { nested: false } }
  >;

  expectAssignable<LiveObject<LsonObject> | undefined>(edge.get("data"));
  expectType<string>(edge.get("data")!.get("string"));
  expectType<number | undefined>(edge.get("data")!.get("number"));
  expectAssignable<{ x: number; y: number }>(edge.get("data")!.get("object"));
  expectAssignable<string[] | undefined>(edge.get("data")!.get("array"));
  expectAssignable<LiveObject<LsonObject>>(edge.get("data")!.get("nested"));
  expectType<string>(edge.get("data")!.get("nested").get("string"));
}

/**
 * LiveblocksFlow
 */
{
  const flow = {} as LiveblocksFlow<CustomNode, CustomEdge>;

  // It is a LiveObject
  expectAssignable<LiveObject<LsonObject>>(flow);

  // Its nodes and edges are LiveMaps.
  expectAssignable<LiveMap<string, LiveblocksNode<CustomNode>>>(
    flow.get("nodes")
  );
  expectAssignable<LiveMap<string, LiveblocksEdge<CustomEdge>>>(
    flow.get("edges")
  );
}
