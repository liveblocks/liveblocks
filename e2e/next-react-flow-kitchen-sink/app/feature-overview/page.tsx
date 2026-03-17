"use client";

import {
  ClientSideSuspense,
  JsonObject,
  RoomProvider,
} from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow/suspense";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  NodeToolbar,
  Position,
  ReactFlow,
  useReactFlow,
  useStore,
  type EdgeProps,
  type Node,
  type NodeProps,
  type OnResize,
} from "@xyflow/react";
import { type ChangeEvent, Fragment, memo, useCallback } from "react";
import "./feature-overview.css";

const EMOJIS = ["🚀", "🔥", "✨"] as const;
const DIMENSION_ATTRIBUTES = ["width", "height"] as const;

type AnnotationNode = Node<{
  level: number;
  label: string;
  arrowStyle: Record<string, string | number>;
}>;

type ToolbarNode = Node<{
  emoji: string;
}>;

type ResizerNode = Node<{
  label: string;
}>;

type FeatureOverviewNode =
  | Node<JsonObject>
  | AnnotationNode
  | ToolbarNode
  | ResizerNode;

const AnnotationNode = memo(({ data }: NodeProps<AnnotationNode>) => {
  const { level, label, arrowStyle } = data;

  return (
    <>
      <div className="annotation-content">
        <div className="annotation-level">{level}.</div>
        <div>{label}</div>
      </div>
      {arrowStyle && (
        <div className="annotation-arrow" style={arrowStyle}>
          ⤹
        </div>
      )}
    </>
  );
});

const ToolbarNode = memo(({ id, data }: NodeProps<ToolbarNode>) => {
  const { emoji = "🚀" } = data;
  const { updateNode } = useReactFlow();

  const handleEmojiSelect = useCallback(
    (selected: string) => {
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, emoji: selected },
      }));
    },
    [id, updateNode]
  );

  return (
    <>
      <NodeToolbar isVisible>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiSelect(emoji)}
            aria-label={`Select emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </NodeToolbar>
      <div>
        <div>{emoji}</div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
});

const ResizerNode = memo(({ id, data }: NodeProps<ResizerNode>) => {
  const { label } = data;
  const { updateNode } = useReactFlow();

  const handleResize = useCallback<OnResize>(
    (_, { width, height }) => {
      updateNode(id, (node) => ({
        ...node,
        style: { ...node.style, width, height },
      }));
    },
    [id, updateNode]
  );

  return (
    <>
      <NodeResizer minWidth={1} minHeight={1} onResize={handleResize} />
      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle"
      />
      <div>{label}</div>
      <div className="resizer-node__handles">
        <Handle
          className="resizer-node__handle custom-handle"
          id="a"
          type="source"
          position={Position.Bottom}
        />
        <Handle
          className="resizer-node__handle custom-handle"
          id="b"
          type="source"
          position={Position.Bottom}
        />
      </div>
    </>
  );
});

const CircleNode = memo(
  ({ positionAbsoluteX, positionAbsoluteY }: NodeProps) => (
    <div>
      <div>
        Position x:{Math.round(positionAbsoluteX)} y:
        {Math.round(positionAbsoluteY)}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle"
      />
    </div>
  )
);

const TextInputNode = memo(({ id }: NodeProps) => {
  const { updateNode } = useReactFlow();

  const dimensions = useStore((state) => {
    const node = state.nodeLookup.get("2-3");

    if (
      !node?.measured?.width ||
      !node?.measured?.height ||
      !state.edges.some((edge) => edge.target === id)
    ) {
      return null;
    }

    return { width: node.measured.width, height: node.measured.height };
  });

  const updateDimension = useCallback(
    (attribute: "width" | "height") =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);

        updateNode("2-3", (node) => ({
          ...node,
          style: { ...node.style, [attribute]: value },
        }));
      },
    [updateNode]
  );

  return (
    <>
      {DIMENSION_ATTRIBUTES.map((attribute) => (
        <Fragment key={attribute}>
          <label className="xy-theme__label">Node {attribute}</label>
          <input
            type="number"
            value={dimensions ? Math.round(dimensions[attribute]) : 0}
            onChange={updateDimension(attribute)}
            className="text-input-node__input xy-theme__input nodrag"
            disabled={!dimensions}
          />
        </Fragment>
      ))}
      {!dimensions && "no node connected"}
      <Handle type="target" position={Position.Top} className="custom-handle" />
    </>
  );
});

function ButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="button-edge__label nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button
            className="button-edge__button"
            onClick={() => deleteElements({ edges: [{ id }] })}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const INITIAL_NODES: FeatureOverviewNode[] = [
  {
    id: "annotation-1",
    type: "annotation",
    draggable: false,
    selectable: false,
    data: {
      level: 1,
      label:
        "Built-in node and edge types. Draggable, deletable and connectable!",
      arrowStyle: {
        right: 0,
        bottom: 0,
        transform: "translate(-30px,10px) rotate(-80deg)",
      },
    },
    position: { x: -200, y: -30 },
  },
  {
    id: "1-1",
    type: "input",
    data: {
      label: "Input Node",
    },
    position: { x: 150, y: 0 },
  },
  {
    id: "1-2",
    type: "default",
    data: {
      label: "Default Node",
    },
    position: { x: 0, y: 100 },
  },
  {
    id: "1-3",
    type: "output",
    data: {
      label: "Output Node",
    },
    position: { x: 300, y: 100 },
  },
  {
    id: "annotation-2",
    type: "annotation",
    draggable: false,
    selectable: false,
    data: {
      level: 2,
      label: "Sub flows, toolbars and resizable nodes!",
      arrowStyle: {
        left: 0,
        bottom: 0,
        transform: "translate(5px, 25px) scale(1, -1) rotate(100deg)",
      },
    },
    position: { x: 220, y: 200 },
  },
  {
    id: "2-1",
    data: {},
    type: "group",
    position: {
      x: -170,
      y: 250,
    },
    style: {
      width: 380,
      height: 180,
    },
  },
  {
    id: "2-2",
    data: {},
    type: "tools",
    position: { x: 50, y: 50 },
    style: {
      width: 80,
      height: 80,
    },
    parentId: "2-1",
    extent: "parent",
  },
  {
    id: "2-3",
    type: "resizer",
    data: {
      label: "Resize Me",
    },
    position: { x: 250, y: 50 },
    style: {
      width: 80,
      height: 80,
    },
    parentId: "2-1",
    extent: "parent",
  },
  {
    id: "annotation-3",
    type: "annotation",
    draggable: false,
    selectable: false,
    data: {
      level: 3,
      label: "Nodes and edges can be anything and are fully customizable!",
      arrowStyle: {
        right: 0,
        bottom: 0,
        transform: "translate(-35px, 20px) rotate(-80deg)",
      },
    },
    position: { x: -40, y: 570 },
  },
  {
    id: "3-2",
    type: "textinput",
    position: { x: 150, y: 650 },
    data: {},
  },
  {
    id: "3-1",
    type: "circle",
    position: { x: 350, y: 500 },
    data: {},
  },
];

const INITIAL_EDGES = [
  {
    id: "e1-2",
    source: "1-1",
    target: "1-2",
    label: "edge",
    type: "smoothstep",
  },
  {
    id: "e1-3",
    source: "1-1",
    target: "1-3",
    animated: true,
    label: "animated edge",
  },
  {
    id: "e2-2",
    source: "1-2",
    target: "2-2",
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: "e2-3",
    source: "2-2",
    target: "2-3",
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: "e3-3",
    source: "2-3",
    sourceHandle: "a",
    target: "3-2",
    type: "button",
    animated: true,
    style: { stroke: "rgb(158, 118, 255)" },
  },
  {
    id: "e3-4",
    source: "2-3",
    sourceHandle: "b",
    target: "3-1",
    type: "button",
  },
];

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow<FeatureOverviewNode>({
      initial: { nodes: INITIAL_NODES, edges: INITIAL_EDGES },
    });

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="top-right"
        nodeTypes={{
          annotation: AnnotationNode,
          tools: ToolbarNode,
          resizer: ResizerNode,
          circle: CircleNode,
          textinput: TextInputNode,
        }}
        edgeTypes={{
          button: ButtonEdge,
        }}
      >
        <Cursors />
        <MiniMap zoomable pannable nodeClassName={(node) => node.type ?? ""} />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id="liveblocks:examples:next-react-flow-kitchen-sink:feature-overview">
      <ClientSideSuspense fallback={null}>
        <Flow />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
