import React from 'react';
import ReactFlow from 'react-flow-renderer';

import useStore from '../src/store';

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    />
  );
}

export default Flow;
