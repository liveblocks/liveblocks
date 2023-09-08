import type { Edge, Node, NodeTypes } from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from "reactflow";

import YItemNode from "./YItemNode";

const nodeTypes: NodeTypes = {
  yItemNode: YItemNode,
};

type YFlowProps = {
  nodes: Node<unknown, string | undefined>[];
  edges: Edge<unknown>[];
};

function YFlow({ nodes, edges }: YFlowProps) {
  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}>
      |<Controls />
      <MiniMap />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
}

export default YFlow;
