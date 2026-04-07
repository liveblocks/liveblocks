/* eslint-disable */

import type { Edge, Node } from "@xyflow/react";
import { expectError, expectType } from "tsd";

import type { FlowDocument } from "../dist/node";

// -- Custom types used by the tests below --

type CustomNodeData = { label: string; priority: number };
type CustomNode = Node<CustomNodeData, "task">;

type CustomEdgeData = { weight: number };
type CustomEdge = Edge<CustomEdgeData, "weighted">;

/**
 * FlowDocument with custom node/edge types — getters
 */
{
  const doc = {} as FlowDocument<CustomNode, CustomEdge>;

  expectType<CustomNode | undefined>(doc.getNode("n1"));
  expectType<CustomEdge | undefined>(doc.getEdge("e1"));
  expectType<CustomNode[]>(doc.getNodes());
  expectType<CustomEdge[]>(doc.getEdges());
}

/**
 * FlowDocument — addNode requires correct shape
 */
{
  const doc = {} as FlowDocument<CustomNode, CustomEdge>;

  // Correct node should be accepted
  doc.addNode({
    id: "n1",
    type: "task",
    position: { x: 0, y: 0 },
    data: { label: "Hello", priority: 1 },
  });

  // Missing required data field should error
  expectError(
    doc.addNode({
      id: "n2",
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "Hello" },
    })
  );

  // Wrong node type should error
  expectError(
    doc.addNode({
      id: "n3",
      type: "wrong",
      position: { x: 0, y: 0 },
      data: { label: "Hello", priority: 1 },
    })
  );
}

/**
 * FlowDocument — addEdge requires correct shape
 */
{
  const doc = {} as FlowDocument<CustomNode, CustomEdge>;

  // Correct edge should be accepted
  doc.addEdge({
    id: "e1",
    type: "weighted",
    source: "n1",
    target: "n2",
    data: { weight: 5 },
  });

  // Wrong edge type should error
  expectError(
    doc.addEdge({
      id: "e2",
      type: "wrong",
      source: "n1",
      target: "n2",
      data: { weight: 5 },
    })
  );
}

/**
 * FlowDocument — updateNode
 */
{
  const doc = {} as FlowDocument<CustomNode, CustomEdge>;

  // Partial update
  doc.updateNode("n1", { position: { x: 10, y: 20 } });

  // Updater function receives the correct type
  doc.updateNode("n1", (node) => {
    expectType<CustomNode>(node);
    return { ...node, position: { x: 0, y: 0 } };
  });
}

/**
 * FlowDocument — updateNodeData
 */
{
  const doc = {} as FlowDocument<CustomNode, CustomEdge>;

  // Partial data update with known key
  doc.updateNodeData("n1", { priority: 2 });

  // Unknown data key should error
  expectError(doc.updateNodeData("n1", { unknown: true }));

  // Updater function receives the correct data type
  doc.updateNodeData("n1", (data) => {
    expectType<CustomNodeData>(data);
    return { ...data, priority: data.priority + 1 };
  });
}

/**
 * FlowDocument — updateEdgeData
 */
{
  const doc = {} as FlowDocument<CustomNode, CustomEdge>;

  // Partial data update with known key
  doc.updateEdgeData("e1", { weight: 5 });

  // Unknown data key should error
  expectError(doc.updateEdgeData("e1", { unknown: true }));

  // Updater function receives possibly-undefined data (edge data is optional in React Flow)
  doc.updateEdgeData("e1", (data) => {
    expectType<CustomEdgeData | undefined>(data);
    return { ...data!, weight: data!.weight + 1 };
  });
}
