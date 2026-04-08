/* eslint-disable */

import type { Edge, Node } from "@xyflow/react";
import { expectError, expectType } from "tsd";

import type { MutableFlow } from "../dist/node";

// -- Custom types used by the tests below --

type CustomNodeData = { label: string; priority: number };
type CustomNode = Node<CustomNodeData, "task">;

type CustomEdgeData = { weight: number };
type CustomEdge = Edge<CustomEdgeData, "weighted">;

/**
 * MutableFlow with custom node/edge types — getters
 */
{
  const flow = {} as MutableFlow<CustomNode, CustomEdge>;

  expectType<readonly CustomNode[]>(flow.nodes);
  expectType<readonly CustomEdge[]>(flow.edges);
  expectType<{ nodes: readonly CustomNode[]; edges: readonly CustomEdge[] }>(
    flow.toJSON()
  );
  expectType<CustomNode | undefined>(flow.getNode("n1"));
  expectType<CustomEdge | undefined>(flow.getEdge("e1"));
}

/**
 * MutableFlow — addNode requires correct shape
 */
{
  const flow = {} as MutableFlow<CustomNode, CustomEdge>;

  // Correct node should be accepted
  flow.addNode({
    id: "n1",
    type: "task",
    position: { x: 0, y: 0 },
    data: { label: "Hello", priority: 1 },
  });

  // Missing required data field should error
  expectError(
    flow.addNode({
      id: "n2",
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "Hello" },
    })
  );

  // Wrong node type should error
  expectError(
    flow.addNode({
      id: "n3",
      type: "wrong",
      position: { x: 0, y: 0 },
      data: { label: "Hello", priority: 1 },
    })
  );
}

/**
 * MutableFlow — addEdge requires correct shape
 */
{
  const flow = {} as MutableFlow<CustomNode, CustomEdge>;

  // Correct edge should be accepted
  flow.addEdge({
    id: "e1",
    type: "weighted",
    source: "n1",
    target: "n2",
    data: { weight: 5 },
  });

  // Wrong edge type should error
  expectError(
    flow.addEdge({
      id: "e2",
      type: "wrong",
      source: "n1",
      target: "n2",
      data: { weight: 5 },
    })
  );
}

/**
 * MutableFlow — updateNode
 */
{
  const flow = {} as MutableFlow<CustomNode, CustomEdge>;

  // Partial update
  flow.updateNode("n1", { position: { x: 10, y: 20 } });

  // Updater function receives the correct type
  flow.updateNode("n1", (node) => {
    expectType<CustomNode>(node);
    return { ...node, position: { x: 0, y: 0 } };
  });
}

/**
 * MutableFlow — updateNodeData
 */
{
  const flow = {} as MutableFlow<CustomNode, CustomEdge>;

  // Partial data update with known key
  flow.updateNodeData("n1", { priority: 2 });

  // Unknown data key should error
  expectError(flow.updateNodeData("n1", { unknown: true }));

  // Updater function receives the correct data type
  flow.updateNodeData("n1", (data) => {
    expectType<CustomNodeData>(data);
    return { ...data, priority: data.priority + 1 };
  });
}

/**
 * MutableFlow — updateEdgeData
 */
{
  const flow = {} as MutableFlow<CustomNode, CustomEdge>;

  // Partial data update with known key
  flow.updateEdgeData("e1", { weight: 5 });

  // Unknown data key should error
  expectError(flow.updateEdgeData("e1", { unknown: true }));

  // Updater function receives possibly-undefined data (edge data is optional in React Flow)
  flow.updateEdgeData("e1", (data) => {
    expectType<CustomEdgeData | undefined>(data);
    return { ...data!, weight: data!.weight + 1 };
  });
}
