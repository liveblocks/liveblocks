import type {
  LiveList,
  LiveMap,
  LiveObject,
  LsonObject,
} from "@liveblocks/core";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import { describe, expectTypeOf, test } from "vitest";

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

describe("LiveblocksNode", () => {
  test("should reflect LiveObject shape and base sync config", () => {
    const node = {} as LiveblocksNode<CustomNode>;

    expectTypeOf(node).toExtend<LiveObject<LsonObject>>();

    expectTypeOf(node.get("style")).toExtend<
      LiveObject<LsonObject> | undefined
    >();
    expectTypeOf(node.get("id")).toEqualTypeOf<string>();

    expectTypeOf(node.get("selected")).toEqualTypeOf<boolean | undefined>();

    expectTypeOf(node.get("position")).toEqualTypeOf<XYPosition>();
  });

  describe("data field (default sync)", () => {
    test("should liveify all data fields when no custom sync config is passed", () => {
      const node = {} as LiveblocksNode<CustomNode>;

      expectTypeOf(node.get("data")).toExtend<LiveObject<LsonObject>>();

      expectTypeOf(node.get("data").get("string")).toEqualTypeOf<string>();
      expectTypeOf(node.get("data").get("array")).toExtend<LiveList<string>>();
      expectTypeOf(node.get("data").get("nested")).toExtend<
        LiveObject<LsonObject>
      >();
      expectTypeOf(node.get("data").get("nested").get("nested")!).toExtend<
        LiveObject<LsonObject>
      >();
    });
  });

  describe("data field (custom sync config)", () => {
    test("should apply atomic and local-only overrides from sync config", () => {
      const node = {} as LiveblocksNode<
        CustomNode,
        { object: "atomic"; array: false; nested: { nested: false } }
      >;

      expectTypeOf(node.get("data")).toExtend<LiveObject<LsonObject>>();

      expectTypeOf(node.get("data").get("string")).toEqualTypeOf<string>();
      expectTypeOf(node.get("data").get("nested")).toExtend<
        LiveObject<LsonObject>
      >();

      expectTypeOf(node.get("data").get("object")).toEqualTypeOf<{
        x: number;
        y: number;
      }>();

      expectTypeOf(node.get("data").get("array")).toEqualTypeOf<
        string[] | undefined
      >();

      expectTypeOf(node.get("data").get("nested").get("nested")).toEqualTypeOf<
        { array: string[] } | undefined
      >();
    });
  });
});

describe("LiveblocksEdge", () => {
  test("should reflect LiveObject shape and base sync config", () => {
    const edge = {} as LiveblocksEdge<CustomEdge>;

    expectTypeOf(edge).toExtend<LiveObject<LsonObject>>();

    expectTypeOf(edge.get("style")).toExtend<
      LiveObject<LsonObject> | undefined
    >();
    expectTypeOf(edge.get("id")).toEqualTypeOf<string>();

    expectTypeOf(edge.get("selected")).toEqualTypeOf<boolean | undefined>();

    expectTypeOf(edge.get("labelBgPadding")).toEqualTypeOf<
      [number, number] | undefined
    >();
  });

  describe("data field (default sync)", () => {
    test("should liveify optional edge data when no custom sync config is passed", () => {
      const edge = {} as LiveblocksEdge<CustomEdge>;

      expectTypeOf(edge.get("data")).toExtend<
        LiveObject<LsonObject> | undefined
      >();

      expectTypeOf(edge.get("data")!.get("string")).toEqualTypeOf<string>();
      expectTypeOf(edge.get("data")!.get("array")).toExtend<LiveList<string>>();
      expectTypeOf(edge.get("data")!.get("nested")).toExtend<
        LiveObject<LsonObject>
      >();
      expectTypeOf(edge.get("data")!.get("nested").get("nested")!).toExtend<
        LiveObject<LsonObject>
      >();
    });
  });

  describe("data field (custom sync config)", () => {
    test("should apply atomic and local-only overrides from sync config", () => {
      const edge = {} as LiveblocksEdge<
        CustomEdge,
        { object: "atomic"; array: false; nested: { nested: false } }
      >;

      expectTypeOf(edge.get("data")).toExtend<
        LiveObject<LsonObject> | undefined
      >();

      expectTypeOf(edge.get("data")!.get("string")).toEqualTypeOf<string>();
      expectTypeOf(edge.get("data")!.get("nested")).toExtend<
        LiveObject<LsonObject>
      >();

      expectTypeOf(edge.get("data")!.get("object")).toEqualTypeOf<{
        x: number;
        y: number;
      }>();

      expectTypeOf(edge.get("data")!.get("array")).toEqualTypeOf<
        string[] | undefined
      >();

      expectTypeOf(edge.get("data")!.get("nested").get("nested")).toEqualTypeOf<
        { array: string[] } | undefined
      >();
    });
  });
});

describe("LiveblocksFlow", () => {
  test("should expose nodes and edges as LiveMaps", () => {
    const flow = {} as LiveblocksFlow<CustomNode, CustomEdge>;

    expectTypeOf(flow).toExtend<LiveObject<LsonObject>>();
    expectTypeOf(flow.get("nodes")).toExtend<
      LiveMap<string, LiveblocksNode<CustomNode>>
    >();
    expectTypeOf(flow.get("edges")).toExtend<
      LiveMap<string, LiveblocksEdge<CustomEdge>>
    >();
  });
});
