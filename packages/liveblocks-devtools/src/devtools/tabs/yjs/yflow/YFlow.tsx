import Dagre from "@dagrejs/dagre";
import cx from "classnames";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useTransition,
} from "react";
import type {
  Edge,
  Node,
  NodeTypes,
  OnSelectionChangeParams,
  ReactFlowState,
} from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
} from "reactflow";
import { shallow } from "zustand/shallow";

import { Loading } from "../../../../components/Loading";
import type { YFlowNodeData } from "../../../../lib/ydoc";
import { getNodesAndEdges } from "../../../../lib/ydoc";
import { EmptyState } from "../../../components/EmptyState";
import { Tooltip } from "../../../components/Tooltip";
import { useStatus, useYdoc } from "../../../contexts/CurrentRoom";
import YItemNode from "./YItemNode";

const nodeTypes: NodeTypes = {
  yItemNode: YItemNode,
};

const selector = (state: ReactFlowState) => ({
  isMinZoom: state.transform[2] <= state.minZoom,
  isMaxZoom: state.transform[2] >= state.maxZoom,
});

function Controls({ className, ...props }: ComponentProps<"div">) {
  const { isMinZoom, isMaxZoom } = useStore(selector, shallow);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView();
  }, [fitView]);

  return (
    <div className={cx(className, "flex items-center")} {...props}>
      <Tooltip content="Zoom in" sideOffset={10}>
        <button
          onClick={handleZoomIn}
          disabled={isMaxZoom}
          className="disabled:opacity-50 p-1.5 text-dark-600 hover:enabled:text-dark-0 focus-visible:enabled:text-dark-0 dark:text-light-600 dark:hover:enabled:text-light-0 dark:focus-visible:enabled:text-light-0"
          aria-label="Zoom in"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 7h8M7 3v8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Zoom out" sideOffset={10}>
        <button
          onClick={handleZoomOut}
          disabled={isMinZoom}
          className="disabled:opacity-50 p-1.5 text-dark-600 hover:enabled:text-dark-0 focus-visible:enabled:text-dark-0 dark:text-light-600 dark:hover:enabled:text-light-0 dark:focus-visible:enabled:text-light-0"
          aria-label="Zoom out"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 7h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Zoom to fit" sideOffset={10}>
        <button
          onClick={handleFitView}
          aria-label="Zoom to fit"
          className="p-1.5 text-dark-600 hover:enabled:text-dark-0 focus-visible:enabled:text-dark-0 dark:text-light-600 dark:hover:enabled:text-light-0 dark:focus-visible:enabled:text-light-0"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 3H4a1 1 0 0 0-1 1v1m8 0V4a1 1 0 0 0-1-1H9m0 8h1a1 1 0 0 0 1-1V9M3 9v1a1 1 0 0 0 1 1h1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node<YFlowNodeData, string>[],
  edges: Edge<object>[]
) => {
  g.setGraph({ rankdir: "TB", nodesep: 50 });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: 200,
      height: node.data.type === "node" ? 64 : 40,
    })
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = g.node(node.id);

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

export function YFlow({ className, ...props }: ComponentProps<"div">) {
  const [isTransitionPending, startTransition] = useTransition();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const ydoc = useYdoc();
  const currentStatus = useStatus();

  useEffect(() => {
    function onUpdate() {
      startTransition(() => {
        const { docEdges, docNodes } = getNodesAndEdges(ydoc);
        const layouted = getLayoutedElements(docNodes, docEdges);
        setEdges(layouted.edges);
        setNodes(layouted.nodes);
      });
    }

    onUpdate();
    ydoc.on("update", onUpdate);

    return () => {
      ydoc.off("update", onUpdate);
    };
  }, [setEdges, setNodes, ydoc]);

  const handleSelectionChange = useCallback(
    (change: OnSelectionChangeParams) => {
      if (!change.nodes.length) {
        return;
      }
      const nodeId = change.nodes[0].id;
      const newEdges = edges.map((edge) => {
        const isSelected = nodeId === edge.source || nodeId === edge.target;
        const opacity = isSelected ? 1 : 0.3;
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity,
          },
        };
      });
      setEdges(newEdges);
    },
    [setEdges, edges]
  );

  if (
    !isTransitionPending &&
    (currentStatus === "connected" ||
      currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
      currentStatus === "reconnecting")
  ) {
    if (edges.length > 0) {
      return (
        <div className={cx(className, "absolute inset-0")} {...props}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              onSelectionChange={handleSelectionChange}
            >
              <MiniMap zoomable pannable />
              <Background variant={BackgroundVariant.Dots} gap={20} size={2} />
              <div className="absolute -bottom-0 left-0 w-full border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 flex h-8 items-center border-t flex-none px-2.5">
                <Controls className="-ml-1.5" />
                <div className="ml-auto">
                  <a
                    href="https://reactflow.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="React Flow attribution"
                    className="text-2xs text-dark-700 dark:text-dark-800"
                  >
                    Built with React Flow
                  </a>
                </div>
              </div>
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      );
    } else {
      return (
        <EmptyState
          description={<>There seems to be no Yjs changes in this&nbsp;room.</>}
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}
