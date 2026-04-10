"use client";

import {
  useCanRedo,
  useCanUndo,
  useOther,
  useRedo,
  useRoom,
  useUndo,
  useUser,
} from "@liveblocks/react";
import { nanoid } from "nanoid";
import {
  Cursors,
  useLiveblocksFlow,
  type CursorsCursorProps,
} from "@liveblocks/react-flow";
import {
  Background,
  BaseEdge,
  ConnectionLineType,
  ConnectionMode,
  ControlButton,
  Controls,
  EdgeLabelRenderer,
  EdgeTypes,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  NodeToolbar,
  NodeTypes,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  getSmoothStepPath,
  useNodes,
  useReactFlow,
  type Connection,
  type EdgeProps,
  type MiniMapNodeProps,
  type NodeChange,
  type NodeProps,
  type OnResize,
} from "@xyflow/react";
import { AvatarStack, Cursor, Icon } from "@liveblocks/react-ui";
import {
  ComponentProps,
  CSSProperties,
  Fragment,
  memo,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isAgentUserId } from "../api/database";
import { submitFlowchartAgentAction } from "./agent";
import {
  BLOCK_COLORS,
  BLOCK_SHAPES,
  DEFAULT_BLOCK_COLOR,
  DEFAULT_BLOCK_SIZE,
  FLOWCHART_EDGE_TYPE,
  FLOWCHART_STORAGE_KEY,
  blockSourceHandleId,
  blockTargetHandleId,
  capitalize,
  createFlowchartEdge,
  createFlowchartNode,
  getBlockColor,
  getBlockShape,
  type BlockColor,
  type BlockHandleSide,
  type BlockShape,
  type FlowchartEdge,
  type FlowchartNode,
  type Point,
} from "./shared";

type PlacementMode =
  | { kind: "idle" }
  | { kind: "placing-shape"; shape: BlockShape; pointer: Point };

function getInitialNodeLayout(
  horizontal: "left" | "center" | "right",
  vertical: number
) {
  const width = 150;
  const height = 100;
  const horizontalGap = 250;
  const verticalGap = 36;

  const midX =
    horizontal === "center"
      ? 0
      : horizontal === "left"
        ? -horizontalGap
        : horizontalGap;
  const x = midX - width / 2;
  const y = vertical * height + (vertical - 1) * verticalGap;

  return {
    position: { x, y },
    width,
    height,
  };
}

const INITIAL_NODE_SPECS = [
  {
    id: "brainstorm",
    label: "Brainstorm",
    shape: "rectangle",
    color: "blue",
    horizontal: "center",
    vertical: 0,
  },
  {
    id: "new-product",
    label: "Idea",
    shape: "ellipse",
    color: "cyan",
    horizontal: "center",
    vertical: 1,
  },
  {
    id: "prototype",
    label: "Prototype",
    shape: "ellipse",
    color: "purple",
    horizontal: "center",
    vertical: 2,
  },
  {
    id: "refinement",
    label: "Refinement",
    shape: "rectangle",
    color: "gray",
    horizontal: "left",
    vertical: 3,
  },
  {
    id: "design",
    label: "Design",
    shape: "rectangle",
    color: "green",
    horizontal: "right",
    vertical: 3,
  },
  {
    id: "testing",
    label: "Testing",
    shape: "ellipse",
    color: "red",
    horizontal: "right",
    vertical: 4,
  },
  {
    id: "production",
    label: "Production",
    shape: "rectangle",
    color: "yellow",
    horizontal: "right",
    vertical: 5,
  },
  {
    id: "launch",
    label: "Launch",
    shape: "ellipse",
    color: "orange",
    horizontal: "right",
    vertical: 6,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  shape: BlockShape;
  color: BlockColor;
  horizontal: "left" | "center" | "right";
  vertical: number;
}>;

const INITIAL_EDGE_SPECS = [
  {
    id: "e-brainstorm-new-product",
    source: "brainstorm",
    target: "new-product",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-new-product-prototype",
    source: "new-product",
    target: "prototype",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-prototype-refinement",
    source: "prototype",
    target: "refinement",
    sourceHandle: "src-left",
    targetHandle: "tgt-top",
    label: "Not ready",
  },
  {
    id: "e-prototype-design",
    source: "prototype",
    target: "design",
    sourceHandle: "src-right",
    targetHandle: "tgt-top",
    label: "Approved",
  },
  {
    id: "e-refinement-design",
    source: "refinement",
    target: "design",
    sourceHandle: "src-right",
    targetHandle: "tgt-left",
  },
  {
    id: "e-design-testing",
    source: "design",
    target: "testing",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-testing-refinement",
    source: "testing",
    target: "refinement",
    sourceHandle: "src-left",
    targetHandle: "tgt-bottom",
    label: "Needs improvement",
  },
  {
    id: "e-testing-production",
    source: "testing",
    target: "production",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-production-launch",
    source: "production",
    target: "launch",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
] as const;

const INITIAL_NODES: FlowchartNode[] = INITIAL_NODE_SPECS.map((node) => {
  const layout = getInitialNodeLayout(node.horizontal, node.vertical);

  return createFlowchartNode({
    id: node.id,
    position: layout.position,
    width: layout.width,
    height: layout.height,
    label: node.label,
    shape: node.shape,
    color: node.color,
  });
});

const INITIAL_EDGES: FlowchartEdge[] = INITIAL_EDGE_SPECS.map((edge) =>
  createFlowchartEdge(edge)
);

function getBlockStyle(color: BlockColor | undefined): CSSProperties {
  return {
    "--flowchart-block-color": getBlockColor(color),
  } as CSSProperties;
}

function usePointerPosition(initial: Point): Point {
  const [position, setPosition] = useState(initial);

  useEffect(() => {
    const updatePosition = (event: { clientX: number; clientY: number }) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("pointermove", updatePosition);
    document.addEventListener("pointerenter", updatePosition);
    document.addEventListener("pointerdown", updatePosition, true);

    return () => {
      document.removeEventListener("pointermove", updatePosition);
      document.removeEventListener("pointerenter", updatePosition);
      document.removeEventListener("pointerdown", updatePosition, true);
    };
  }, []);

  return position;
}

function ToolbarBlockPreview({ shape }: { shape: BlockShape }) {
  return (
    <span className={"flowchart-toolbar-block-preview"} aria-hidden>
      <div
        className="flowchart-block flowchart-toolbar-block-preview-shape"
        style={getBlockStyle(DEFAULT_BLOCK_COLOR)}
        data-shape={getBlockShape(shape)}
      />
    </span>
  );
}

function BlockDragPreview({ shape }: { shape: BlockShape }) {
  return (
    <div
      className="flowchart-block-drag-preview"
      style={{
        width: DEFAULT_BLOCK_SIZE,
        height: DEFAULT_BLOCK_SIZE,
      }}
    >
      <div
        className="flowchart-block"
        style={getBlockStyle(DEFAULT_BLOCK_COLOR)}
        data-shape={getBlockShape(shape)}
      />
    </div>
  );
}

const BlockNode = memo(({ id, data, selected }: NodeProps<FlowchartNode>) => {
  const { updateNode } = useReactFlow();
  const [labelDraft, setLabelDraft] = useState(data.label);

  useEffect(() => {
    setLabelDraft(data.label);
  }, [data.label]);

  const commitLabel = useCallback(
    (text: string) => {
      const nextLabel = text.trim();

      setLabelDraft(nextLabel);
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, label: nextLabel },
      }));
    },
    [id, updateNode]
  );

  const handleShapeChange = useCallback(
    (shape: BlockShape) => {
      updateNode(id, (node) => ({ ...node, data: { ...node.data, shape } }));
    },
    [id, updateNode]
  );

  const handleColorChange = useCallback(
    (color: BlockColor) => {
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, color },
      }));
    },
    [id, updateNode]
  );

  const handleResize = useCallback<OnResize>(
    (_, { x, y, width, height }) => {
      updateNode(id, (node) => ({
        ...node,
        position: { x, y },
        width,
        height,
      }));
    },
    [id, updateNode]
  );

  return (
    <>
      <NodeToolbar isVisible={selected} className="flowchart-node-toolbar">
        <div className="flowchart-node-toolbar-buttons">
          {BLOCK_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => handleShapeChange(shape)}
              className="flowchart-node-toolbar-button"
              data-active={data.shape === shape ? "" : undefined}
              title={capitalize(shape)}
              aria-label={`Set shape to ${shape}`}
            >
              <ToolbarBlockPreview shape={shape} />
            </button>
          ))}
        </div>
        <div className="flowchart-node-toolbar-colors">
          {(Object.keys(BLOCK_COLORS) as BlockColor[]).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              className="flowchart-node-toolbar-color"
              data-active={data.color === color ? "" : undefined}
              style={getBlockStyle(color)}
              title={capitalize(color)}
            />
          ))}
        </div>
      </NodeToolbar>

      <div
        className="flowchart-block"
        style={getBlockStyle(data.color)}
        data-shape={getBlockShape(data.shape)}
      >
        <textarea
          className="flowchart-block-label nodrag"
          value={labelDraft}
          placeholder="Add text"
          rows={1}
          onChange={(event) => setLabelDraft(event.target.value)}
          onBlur={(event) => commitLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.blur();
              return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
        />
      </div>

      <NodeResizer
        minWidth={50}
        minHeight={50}
        isVisible={selected}
        onResize={handleResize}
      />

      {(
        [
          [Position.Top, "top"],
          [Position.Right, "right"],
          [Position.Bottom, "bottom"],
          [Position.Left, "left"],
        ] as const satisfies ReadonlyArray<readonly [Position, BlockHandleSide]>
      ).map(([position, side]) => (
        <Fragment key={side}>
          <Handle
            type="target"
            position={position}
            id={blockTargetHandleId(side)}
            className="flowchart-handle"
          />
          <Handle
            type="source"
            position={position}
            id={blockSourceHandleId(side)}
            className="flowchart-handle"
          />
        </Fragment>
      ))}
    </>
  );
});

const FlowchartLabelEdge = memo(
  ({
    id,
    data,
    selected,
    markerEnd,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
  }: EdgeProps<FlowchartEdge>) => {
    const { updateEdge } = useReactFlow();
    const [labelDraft, setLabelDraft] = useState(data?.label ?? "");
    const [isEdgeHovered, setEdgeHovered] = useState(false);
    const [labelFocused, setLabelFocused] = useState(false);
    const showLabel = selected || isEdgeHovered || labelFocused;
    const trimmedLabel = labelDraft.trim();
    const edgeGroupRef = useRef<SVGGElement>(null);
    const labelContainerRef = useRef<HTMLDivElement>(null);
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
    });

    useEffect(() => {
      setLabelDraft(data?.label ?? "");
    }, [data?.label]);

    const isPointerWithinLabel = useCallback((target: EventTarget | null) => {
      if (target == null || !(target instanceof Node)) {
        return false;
      }

      return (
        (edgeGroupRef.current?.contains(target) ?? false) ||
        (labelContainerRef.current?.contains(target) ?? false)
      );
    }, []);

    const handlePointerEnter = useCallback(() => {
      setEdgeHovered(true);
    }, []);

    const handlePointerLeave = useCallback(
      (event: ReactPointerEvent) => {
        if (isPointerWithinLabel(event.relatedTarget)) {
          return;
        }

        setEdgeHovered(false);
      },
      [isPointerWithinLabel]
    );

    const commitLabel = useCallback(
      (text: string) => {
        const nextLabel = text.trim();

        setLabelDraft(nextLabel);
        updateEdge(id, (edge) => ({
          ...edge,
          data: {
            label: nextLabel,
          },
        }));
      },
      [id, updateEdge]
    );

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.blur();
        }
      },
      []
    );

    return (
      <>
        <g
          ref={edgeGroupRef}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        </g>
        <EdgeLabelRenderer>
          <div
            ref={labelContainerRef}
            className="flowchart-edge-label-container nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            {showLabel ? (
              <div className="flowchart-edge-label-sizing">
                <span className="flowchart-edge-label-sizing-text" aria-hidden>
                  {labelDraft.length > 0 ? labelDraft : "Add label"}
                </span>
                <input
                  className="flowchart-edge-label"
                  value={labelDraft}
                  placeholder="Add label"
                  onChange={(event) => setLabelDraft(event.target.value)}
                  onFocus={(event) => {
                    setLabelFocused(true);
                    event.currentTarget.select();
                  }}
                  onBlur={(event) => {
                    commitLabel(event.target.value);
                    setLabelFocused(false);
                  }}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                />
              </div>
            ) : trimmedLabel ? (
              <span
                className="flowchart-edge-label-readonly"
                title={trimmedLabel}
              >
                {trimmedLabel}
              </span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

const MiniMapNode = memo(
  ({ id, x: boundsX, y: boundsY, width, height, color }: MiniMapNodeProps) => {
    const nodes = useNodes<FlowchartNode>();
    const nodeData = nodes.find((node) => node.id === id)?.data;
    const shape = getBlockShape(nodeData?.shape);

    if (shape === "ellipse") {
      return (
        <ellipse
          cx={boundsX + width / 2}
          cy={boundsY + height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={color}
        />
      );
    } else if (shape === "diamond") {
      return (
        <polygon
          points={`${boundsX + width / 2},${boundsY} ${boundsX + width},${boundsY + height / 2} ${boundsX + width / 2},${boundsY + height} ${boundsX},${boundsY + height / 2}`}
          fill={color}
        />
      );
    } else if (shape === "rectangle") {
      return (
        <rect
          x={boundsX}
          y={boundsY}
          width={width}
          height={height}
          rx={2}
          fill={color}
        />
      );
    } else {
      return null;
    }
  }
);

function NewShapeCursor({
  shape,
  pointer,
}: {
  shape: BlockShape;
  pointer: Point;
}) {
  const position = usePointerPosition(pointer);

  return (
    <div
      className="flowchart-shape-place-cursor"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${position.x - DEFAULT_BLOCK_SIZE / 2}px, ${position.y - DEFAULT_BLOCK_SIZE / 2}px)`,
        zIndex: 999999,
        pointerEvents: "none",
        cursor: "none",
      }}
    >
      <BlockDragPreview shape={shape} />
    </div>
  );
}

function PlacementOverlay({ mode }: { mode: PlacementMode }) {
  if (mode.kind !== "placing-shape") {
    return null;
  }

  return <NewShapeCursor shape={mode.shape} pointer={mode.pointer} />;
}

function ToolbarShapeItem({
  shape,
  onSelectForPlacement,
}: {
  shape: BlockShape;
  onSelectForPlacement: (shape: BlockShape, pointer: Point) => void;
}) {
  return (
    <button
      type="button"
      className="flowchart-toolbar-shape-button"
      onClick={(event) =>
        onSelectForPlacement(shape, {
          x: event.clientX,
          y: event.clientY,
        })
      }
      title={capitalize(shape)}
      aria-label={`Place ${shape}`}
    >
      <ToolbarBlockPreview shape={shape} />
    </button>
  );
}

function FlowToolbar({
  mode,
  onSelectShapeForPlacement,
}: {
  mode: PlacementMode;
  onSelectShapeForPlacement: (shape: BlockShape, pointer: Point) => void;
}) {
  if (mode.kind !== "idle") {
    return null;
  }

  return (
    <div className="flowchart-toolbar">
      {BLOCK_SHAPES.map((shape) => (
        <ToolbarShapeItem
          key={shape}
          shape={shape}
          onSelectForPlacement={onSelectShapeForPlacement}
        />
      ))}
    </div>
  );
}

function FlowCursor({ userId, connectionId }: CursorsCursorProps) {
  const { user, isLoading } = useUser(userId);
  const isThinking = useOther(connectionId, (other) => other.presence.thinking);
  const isAgentCursor = isAgentUserId(userId);

  if (isLoading) {
    return null;
  }

  if (isAgentCursor) {
    return (
      <div className="flowchart-agent-cursor-wobble-x">
        <div className="flowchart-agent-cursor-wobble-y">
          <Cursor
            className="flowchart-cursor"
            color={user?.color}
            label={
              user ? (
                <>
                  {isThinking ? (
                    <span className="flowchart-agent-cursor-thinking">
                      Thinking…
                    </span>
                  ) : (
                    user.name
                  )}
                </>
              ) : undefined
            }
          />
        </div>
      </div>
    );
  }

  return (
    <Cursor
      className="flowchart-cursor"
      color={user?.color}
      label={user?.name}
    />
  );
}

const nodeTypes: NodeTypes = {
  block: BlockNode,
};

const edgeTypes: EdgeTypes = {
  [FLOWCHART_EDGE_TYPE]: FlowchartLabelEdge,
};

function Flow({ className, ...props }: ComponentProps<"div">) {
  const didReconnectRef = useRef(false);
  const reactFlow = useReactFlow<FlowchartNode, FlowchartEdge>();
  const [placementMode, setPlacementMode] = useState<PlacementMode>({
    kind: "idle",
  });
  const isPlacing = placementMode.kind !== "idle";
  const isPickingPlacement = placementMode.kind === "placing-shape";
  const roomId = useRoom().id;
  const [agentPrompt, setAgentPrompt] = useState("");
  const trimmedAgentPrompt = agentPrompt.trim();
  const [agentState, formAction, isAgentPending] = useActionState(
    submitFlowchartAgentAction,
    null
  );
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<FlowchartNode, FlowchartEdge>({
      suspense: true,
      nodes: { initial: INITIAL_NODES },
      edges: { initial: INITIAL_EDGES },
      storageKey: FLOWCHART_STORAGE_KEY,
    });

  const resetPlacementMode = useCallback(() => {
    setPlacementMode({ kind: "idle" });
  }, []);

  useEffect(() => {
    if (agentState?.ok === true) {
      setAgentPrompt("");
    }
  }, [agentState]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      if (target.isContentEditable) {
        return true;
      }
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (placementMode.kind !== "idle") {
          resetPlacementMode();
        }
        return;
      }

      const isModZ =
        event.key.toLowerCase() === "z" &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey;

      if (!isModZ || isEditableTarget(event.target)) {
        return;
      }

      if (event.shiftKey) {
        if (canRedo) {
          event.preventDefault();
          redo();
        }
      } else if (canUndo) {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [placementMode.kind, resetPlacementMode, undo, redo, canUndo, canRedo]);

  const addBlockAtPosition = useCallback(
    (shape: BlockShape, position: Point) => {
      const deselectChanges: NodeChange<FlowchartNode>[] = reactFlow
        .getNodes()
        .filter((node) => node.selected)
        .map((node) => ({
          type: "select",
          id: node.id,
          selected: false,
        }));

      onNodesChange([
        ...deselectChanges,
        {
          type: "add",
          item: createFlowchartNode({
            id: `block-${nanoid()}`,
            position,
            shape,
            color: DEFAULT_BLOCK_COLOR,
            selected: true,
          }),
        },
      ]);
    },
    [reactFlow, onNodesChange]
  );

  const handleCanvasClickForPlacement = useCallback(
    (event: ReactMouseEvent) => {
      if (placementMode.kind !== "placing-shape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const flowPosition = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const half = DEFAULT_BLOCK_SIZE / 2;

      addBlockAtPosition(placementMode.shape, {
        x: flowPosition.x - half,
        y: flowPosition.y - half,
      });
      resetPlacementMode();
    },
    [addBlockAtPosition, placementMode, reactFlow, resetPlacementMode]
  );

  const onReconnect = useCallback(
    (oldEdge: FlowchartEdge, newConnection: Connection) => {
      didReconnectRef.current = true;

      onEdgesChange([
        { type: "remove", id: oldEdge.id },
        {
          type: "add",
          item: {
            ...oldEdge,
            id: `e-${newConnection.source}-${newConnection.target}-${nanoid()}`,
            source: newConnection.source ?? oldEdge.source,
            target: newConnection.target ?? oldEdge.target,
            sourceHandle: newConnection.sourceHandle ?? null,
            targetHandle: newConnection.targetHandle ?? null,
            selected: false,
          },
        },
      ]);
    },
    [onEdgesChange]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: FlowchartEdge) => {
      if (!didReconnectRef.current) {
        onEdgesChange([{ type: "remove", id: edge.id }]);
      }

      didReconnectRef.current = false;
    },
    [onEdgesChange]
  );

  return (
    <div
      className="flowchart-flow"
      data-placing={isPickingPlacement ? "" : undefined}
      {...props}
    >
      <PlacementOverlay mode={placementMode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onPaneClick={handleCanvasClickForPlacement}
        onNodeClick={handleCanvasClickForPlacement}
        onPaneContextMenu={(event) => {
          if (!isPlacing) {
            return;
          }

          event.preventDefault();
          resetPlacementMode();
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: FLOWCHART_EDGE_TYPE,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Step}
        panOnScroll
        panOnDrag={[1]}
        elementsSelectable={!isPickingPlacement}
        selectionOnDrag={!isPickingPlacement}
        selectionMode={SelectionMode.Partial}
        fitView
        edgesReconnectable
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
      >
        <Cursors components={{ Cursor: FlowCursor }} />
        <Controls orientation="horizontal" showInteractive={false}>
          <ControlButton onClick={undo} disabled={!canUndo}>
            <Icon.Undo />
          </ControlButton>
          <ControlButton onClick={redo} disabled={!canRedo}>
            <Icon.Redo />
          </ControlButton>
        </Controls>
        <MiniMap
          nodeComponent={MiniMapNode}
          nodeColor={(node: FlowchartNode) => getBlockColor(node.data.color)}
          nodeStrokeWidth={0}
        />
        <Panel position="bottom-center">
          <FlowToolbar
            mode={placementMode}
            onSelectShapeForPlacement={(shape, pointer) => {
              setPlacementMode({ kind: "placing-shape", shape, pointer });
            }}
          />
        </Panel>
        <Panel position="top-right">
          <div className="flowchart-avatar-stack">
            <AvatarStack size={32} gap={3} max={5} />
          </div>
        </Panel>
        <Panel position="top-left">
          <form className="flowchart-agent-panel" action={formAction}>
            <input type="hidden" name="roomId" value={roomId} />
            <textarea
              id="flowchart-agent-prompt"
              name="prompt"
              className="flowchart-agent-textarea nodrag"
              rows={3}
              placeholder="Create a flowchart about… Update the flowchart…"
              value={agentPrompt}
              disabled={isAgentPending}
              onChange={(event) => {
                setAgentPrompt(event.target.value);
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !isAgentPending &&
                  agentPrompt.trim() !== ""
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className="flowchart-agent-submit"
              disabled={trimmedAgentPrompt === "" || isAgentPending}
            >
              {isAgentPending ? "Applying…" : "Apply"}
            </button>
          </form>
        </Panel>
        <Background />
      </ReactFlow>
    </div>
  );
}

export function Flowchart() {
  return (
    <div className="flowchart">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}
