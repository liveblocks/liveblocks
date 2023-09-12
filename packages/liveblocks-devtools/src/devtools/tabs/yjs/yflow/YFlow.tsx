import cx from "classnames";
import { type ComponentProps, useCallback } from "react";
import type { NodeTypes, ReactFlowState } from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  useStore,
} from "reactflow";
import { shallow } from "zustand/shallow";

import { Tooltip } from "../../../components/Tooltip";
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

export function YFlow({
  nodes,
  edges,
  ...props
}: ComponentProps<typeof ReactFlow>) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      elementsSelectable={false}
      {...props}
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
  );
}
