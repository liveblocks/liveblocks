import type { Edge, Node } from "@xyflow/react";
import { describe, expectTypeOf, test } from "vitest";

import type { MutableFlow } from "@liveblocks/react-flow/node";

type CustomNodeData = { label: string; priority: number };
type CustomNode = Node<CustomNodeData, "task">;

type CustomEdgeData = { weight: number };
type CustomEdge = Edge<CustomEdgeData, "weighted">;

describe("MutableFlow", () => {
  describe("getters", () => {
    test("should expose typed nodes, edges, and accessors", () => {
      const flow = {} as MutableFlow<CustomNode, CustomEdge>;

      expectTypeOf(flow.nodes).toEqualTypeOf<readonly CustomNode[]>();
      expectTypeOf(flow.edges).toEqualTypeOf<readonly CustomEdge[]>();
      expectTypeOf(flow.toJSON()).toEqualTypeOf<{
        nodes: readonly CustomNode[];
        edges: readonly CustomEdge[];
      }>();
      expectTypeOf(flow.getNode("n1")).toEqualTypeOf<CustomNode | undefined>();
      expectTypeOf(flow.getEdge("e1")).toEqualTypeOf<CustomEdge | undefined>();
    });
  });

  describe("addNode", () => {
    test("should require correct node shape", () => {
      const flow = {} as MutableFlow<CustomNode, CustomEdge>;

      flow.addNode({
        id: "n1",
        type: "task",
        position: { x: 0, y: 0 },
        data: { label: "Hello", priority: 1 },
      });

      flow.addNode({
        id: "n2",
        type: "task",
        position: { x: 0, y: 0 },
        // @ts-expect-error - Missing required `priority` on data
        data: { label: "Hello" },
      });

      flow.addNode({
        id: "n3",
        // @ts-expect-error - Wrong node `type` literal
        type: "wrong",
        position: { x: 0, y: 0 },
        data: { label: "Hello", priority: 1 },
      });
    });
  });

  describe("addEdge", () => {
    test("should require correct edge shape", () => {
      const flow = {} as MutableFlow<CustomNode, CustomEdge>;

      flow.addEdge({
        id: "e1",
        type: "weighted",
        source: "n1",
        target: "n2",
        data: { weight: 5 },
      });

      flow.addEdge({
        id: "e2",
        // @ts-expect-error - Wrong edge `type` literal
        type: "wrong",
        source: "n1",
        target: "n2",
        data: { weight: 5 },
      });
    });
  });

  describe("updateNode", () => {
    test("should accept partial updates and typed updaters", () => {
      const flow = {} as MutableFlow<CustomNode, CustomEdge>;

      flow.updateNode("n1", { position: { x: 10, y: 20 } });

      flow.updateNode("n1", (node) => {
        expectTypeOf(node).toEqualTypeOf<CustomNode>();
        return { ...node, position: { x: 0, y: 0 } };
      });
    });
  });

  describe("updateNodeData", () => {
    test("should accept partial data and typed updaters", () => {
      const flow = {} as MutableFlow<CustomNode, CustomEdge>;

      flow.updateNodeData("n1", { priority: 2 });

      // @ts-expect-error - Unknown data key
      flow.updateNodeData("n1", { unknown: true });

      flow.updateNodeData("n1", (data) => {
        expectTypeOf(data).toEqualTypeOf<CustomNodeData>();
        return { ...data, priority: data.priority + 1 };
      });
    });
  });

  describe("updateEdgeData", () => {
    test("should accept partial data and typed updaters", () => {
      const flow = {} as MutableFlow<CustomNode, CustomEdge>;

      flow.updateEdgeData("e1", { weight: 5 });

      // @ts-expect-error - Unknown data key
      flow.updateEdgeData("e1", { unknown: true });

      flow.updateEdgeData("e1", (data) => {
        expectTypeOf(data).toEqualTypeOf<CustomEdgeData | undefined>();
        return { ...data!, weight: data!.weight + 1 };
      });
    });
  });
});
