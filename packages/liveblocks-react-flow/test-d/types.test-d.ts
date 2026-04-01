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

  // The node itself becomes a LiveObject.
  expectAssignable<LiveObject<LsonObject>>(node);

  // Its root fields are "liveified" or not according to the base sync config.
  {
    // Synced fields are "liveified": scalars stay unchanged, objects become LiveObjects, and arrays become LiveLists.
    expectAssignable<LiveObject<LsonObject> | undefined>(node.get("style"));
    expectType<string>(node.get("id"));

    // `selected` is marked as local-only in the base sync config, so it becomes optional.
    expectType<boolean | undefined>(node.get("selected"));

    // `position` is marked as atomic in the base sync config, so it stays as is instead of becoming a LiveObject.
    expectType<XYPosition>(node.get("position"));
  }

  // The `data` field follows the sync config provided as a second generic.
  {
    // If no custom sync config is passed, everything is synced.
    {
      const node = {} as LiveblocksNode<CustomNode>;

      // The `data` field is always a LiveObject.
      expectAssignable<LiveObject<LsonObject>>(node.get("data"));

      // Synced fields are "liveified": scalars stay unchanged, objects become LiveObjects, and arrays become LiveLists.
      expectType<string>(node.get("data").get("string"));
      expectAssignable<LiveList<string>>(node.get("data").get("array"));
      expectAssignable<LiveObject<LsonObject>>(node.get("data").get("nested"));
      expectAssignable<LiveObject<LsonObject>>(
        node.get("data").get("nested").get("nested")!
      );
    }

    // If a custom sync config is passed, it applies to the types as expected.
    {
      const node = {} as LiveblocksNode<
        CustomNode,
        { object: "atomic"; array: false; nested: { nested: false } }
      >;

      // The `data` field is always a LiveObject.
      expectAssignable<LiveObject<LsonObject>>(node.get("data"));

      // Fields not present in the custom sync config are still synced, so they are still "liveified".
      expectType<string>(node.get("data").get("string"));
      expectAssignable<LiveObject<LsonObject>>(node.get("data").get("nested"));

      // `object` is marked as atomic in the custom sync config, so it stays as is instead of becoming a LiveObject.
      expectType<{ x: number; y: number }>(node.get("data").get("object"));

      // `array` is marked as local-only in the custom sync config, so it stays as is instead of becoming a LiveList and becomes optional.
      expectType<string[] | undefined>(node.get("data").get("array"));

      // `nested.nested` is marked as local-only in the custom sync config, so it stays as is instead of becoming a LiveObject and becomes optional.
      expectType<{ array: string[] } | undefined>(
        node.get("data").get("nested").get("nested")
      );
    }
  }
}

/**
 * LiveblocksEdge
 */
{
  const edge = {} as LiveblocksEdge<CustomEdge>;

  // The edge itself becomes a LiveObject.
  expectAssignable<LiveObject<LsonObject>>(edge);

  // Its root fields are "liveified" or not according to the base sync config.
  {
    // Synced fields are "liveified": scalars stay unchanged, objects become LiveObjects, and arrays become LiveLists.
    expectAssignable<LiveObject<LsonObject> | undefined>(edge.get("style"));
    expectType<string>(edge.get("id"));

    // `selected` is marked as local-only in the base sync config, so it becomes optional.
    expectType<boolean | undefined>(edge.get("selected"));

    // `labelBgPadding` is marked as atomic in the base sync config, so it stays as is instead of becoming a LiveObject.
    expectType<[number, number] | undefined>(edge.get("labelBgPadding"));
  }

  // The `data` field follows the sync config provided as a second generic.
  {
    // If no custom sync config is passed, everything is synced.
    {
      const edge = {} as LiveblocksEdge<CustomEdge>;

      // On React Flow’s `Edge`, `data` is optional, so the LiveObject reflects that.
      expectAssignable<LiveObject<LsonObject> | undefined>(edge.get("data"));

      // Synced fields are "liveified": scalars stay unchanged, objects become LiveObjects, and arrays become LiveLists.
      expectType<string>(edge.get("data")!.get("string"));
      expectAssignable<LiveList<string>>(edge.get("data")!.get("array"));
      expectAssignable<LiveObject<LsonObject>>(edge.get("data")!.get("nested"));
      expectAssignable<LiveObject<LsonObject>>(
        edge.get("data")!.get("nested").get("nested")!
      );
    }

    // If a custom sync config is passed, it applies to the types as expected.
    {
      const edge = {} as LiveblocksEdge<
        CustomEdge,
        { object: "atomic"; array: false; nested: { nested: false } }
      >;

      // On React Flow’s `Edge`, `data` is optional, so the LiveObject reflects that.
      expectAssignable<LiveObject<LsonObject> | undefined>(edge.get("data"));

      // Fields not present in the custom sync config are still synced, so they are still "liveified".
      expectType<string>(edge.get("data")!.get("string"));
      expectAssignable<LiveObject<LsonObject>>(edge.get("data")!.get("nested"));

      // `object` is marked as atomic in the custom sync config, so it stays as is instead of becoming a LiveObject.
      expectType<{ x: number; y: number }>(edge.get("data")!.get("object"));

      // `array` is marked as local-only in the custom sync config, so it stays as is instead of becoming a LiveList and becomes optional.
      expectType<string[] | undefined>(edge.get("data")!.get("array"));

      // `nested.nested` is marked as local-only in the custom sync config, so it stays as is instead of becoming a LiveObject and becomes optional.
      expectType<{ array: string[] } | undefined>(
        edge.get("data")!.get("nested").get("nested")
      );
    }
  }
}

/**
 * LiveblocksFlow
 */
{
  const flow = {} as LiveblocksFlow<CustomNode, CustomEdge>;

  // A flow is a LiveObject containing nodes and edges as LiveMaps.
  expectAssignable<LiveObject<LsonObject>>(flow);
  expectAssignable<LiveMap<string, LiveblocksNode<CustomNode>>>(
    flow.get("nodes")
  );
  expectAssignable<LiveMap<string, LiveblocksEdge<CustomEdge>>>(
    flow.get("edges")
  );
}
