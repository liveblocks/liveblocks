"use client";

import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
  useUser,
} from "@liveblocks/react";
import {
  Cursors,
  useLiveblocksFlow,
  type CursorsCursorProps,
} from "@liveblocks/react-flow";
import { Cursor } from "@liveblocks/react-ui";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  ControlButton,
  MarkerType,
  Panel,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type NodeChange,
} from "@xyflow/react";
import {
  Bot,
  Eye,
  FileOutput,
  Plus,
  Redo2,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { NODE_WIDTH, nodeTypes } from "./nodes";
import { useRun } from "./run-context";
import {
  ANY_HANDLE,
  FLOW_STORAGE_KEY,
  IN_HANDLE,
  WORKFLOW_EDGE_TYPE,
  createJevNode,
  createLlmNode,
  createOutputNode,
  createWorkflowEdge,
  getReachableNodeIds,
  getOutputPropertyId,
  wouldCreateCycle,
  type WorkflowEdge,
  type WorkflowNode,
} from "./shared";

function FlowCursor({ userId }: CursorsCursorProps) {
  const { user, isLoading } = useUser(userId);

  if (isLoading) {
    return null;
  }

  return <Cursor color={user?.color} label={user?.name} />;
}

/**
 * Shown while a run is previewed on the canvas. Exiting returns the canvas to
 * plain editing: no dimmed nodes, no highlighted path.
 */
function RunPreviewBanner() {
  const { selectedRunId, selectRun, messages } = useRun();

  if (selectedRunId === null) {
    return null;
  }

  const running = messages.some((message) => message.status === "running");
  const failed = messages.some((message) => message.status === "error");
  const label = running
    ? "Run in progress"
    : failed
      ? "Run failed"
      : "Run preview";

  return (
    <div className="run-preview-banner floating-surface flex items-center gap-2 py-1 pl-3 pr-1 text-xs">
      <Eye className="size-3.5 text-violet-600" />
      <span className="font-medium text-neutral-800">{label}</span>
      <span className="run-preview-details text-neutral-400">
        {messages.length} node{messages.length === 1 ? "" : "s"} · Esc
      </span>
      <button
        type="button"
        onClick={() => selectRun(null)}
        className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2 font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <X className="size-3.5" /> Exit preview
      </button>
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg"
    >
      {message}
    </div>
  );
}

export function WorkflowEditor({ className, ...props }: ComponentProps<"div">) {
  const reactFlow = useReactFlow<WorkflowNode, WorkflowEdge>();
  const { results, selectedRunId, selectRun } = useRun();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const [toast, setToast] = useState<string | null>(null);

  const { nodes, edges, onNodesChange, onEdgesChange, onDelete } =
    useLiveblocksFlow<WorkflowNode, WorkflowEdge>({
      suspense: true,
      storageKey: FLOW_STORAGE_KEY,
    });

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedRunId !== null) {
        if (!isEditableTarget(event.target)) {
          selectRun(null);
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
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, canUndo, canRedo, selectedRunId, selectRun]);

  const reachable = useMemo(
    () => getReachableNodeIds(nodes, edges),
    [nodes, edges]
  );

  // Display older single-input connections on the Customer handle.
  const resolvedEdges = useMemo<WorkflowEdge[]>(() => {
    const outputIds = new Set(
      nodes.filter((node) => node.type === "output").map((node) => node.id)
    );
    return edges.map((edge) =>
      outputIds.has(edge.target)
        ? { ...edge, targetHandle: getOutputPropertyId(edge.targetHandle) }
        : edge
    );
  }, [nodes, edges]);

  // The selected run's path is derived only, never written back to Storage.
  const decoratedEdges = useMemo<WorkflowEdge[]>(() => {
    return resolvedEdges.map((edge) => {
      const source = results.get(edge.source);
      const target = results.get(edge.target);
      const fired =
        source !== undefined &&
        edge.sourceHandle != null &&
        (source.firedHandles?.includes(edge.sourceHandle) ?? false) &&
        target !== undefined;
      const unreachable = !reachable.has(edge.target);

      return {
        ...edge,
        animated: fired && target?.status === "running",
        className: fired
          ? "workflow-edge-fired"
          : unreachable || (selectedRunId !== null && !fired)
            ? "workflow-edge-muted"
            : undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: fired ? "#7c3aed" : "#a3a3a3",
        },
      };
    });
  }, [resolvedEdges, results, reachable, selectedRunId]);

  const decoratedNodes = useMemo<WorkflowNode[]>(() => {
    return nodes.map((node) =>
      reachable.has(node.id)
        ? node
        : { ...node, className: "workflow-node-unreachable" }
    );
  }, [nodes, reachable]);

  const isValidConnection = useCallback<IsValidConnection<WorkflowEdge>>(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) {
        return false;
      }

      if (wouldCreateCycle(edges, connection.source, connection.target)) {
        return false;
      }

      // A source may feed several properties, but each handle pair is unique.
      return !resolvedEdges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          edge.sourceHandle === connection.sourceHandle &&
          (edge.targetHandle ?? IN_HANDLE) ===
            (connection.targetHandle ?? IN_HANDLE)
      );
    },
    [edges, resolvedEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      if (wouldCreateCycle(edges, connection.source, connection.target)) {
        setToast("That connection would create a loop.");
        return;
      }

      onEdgesChange([
        {
          type: "add",
          item: createWorkflowEdge({
            source: connection.source,
            sourceHandle: connection.sourceHandle ?? ANY_HANDLE,
            target: connection.target,
            targetHandle: connection.targetHandle ?? IN_HANDLE,
          }),
        },
      ]);
    },
    [edges, onEdgesChange]
  );

  const addNode = useCallback(
    (kind: "jev" | "llm" | "output") => {
      // Place new nodes near the center of the current viewport, offset so
      // repeated clicks don't stack exactly.
      const container = document.querySelector(".react-flow");
      const width = container?.clientWidth ?? 800;
      const height = container?.clientHeight ?? 600;
      const center = reactFlow.screenToFlowPosition({
        x: width / 2,
        y: height / 2,
      });
      const jitter = (Math.random() - 0.5) * 80;
      const position = {
        x: center.x - NODE_WIDTH / 2 + jitter,
        y: center.y - 60 + jitter,
      };
      const deselect: NodeChange<WorkflowNode>[] = reactFlow
        .getNodes()
        .filter((node) => node.selected)
        .map((node) => ({ type: "select", id: node.id, selected: false }));

      const item =
        kind === "jev"
          ? createJevNode({ position, selected: true })
          : kind === "llm"
            ? createLlmNode({ position, selected: true })
            : createOutputNode({ position, selected: true });

      onNodesChange([...deselect, { type: "add", item }]);
    },
    [reactFlow, onNodesChange]
  );

  return (
    <div className={`workflow-canvas relative ${className ?? ""}`} {...props}>
      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={decoratedNodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDelete={onDelete}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: WORKFLOW_EDGE_TYPE,
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        panOnScroll
        panOnDrag={[1, 2]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Cursors components={{ Cursor: FlowCursor }} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#d8d6d1"
        />
        <Controls
          orientation="horizontal"
          showInteractive={false}
          position="bottom-left"
        >
          <ControlButton
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 />
          </ControlButton>
          <ControlButton
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 />
          </ControlButton>
        </Controls>
        <Panel position="top-left">
          <div
            className="node-toolbar floating-surface flex items-center gap-0.5 p-1"
            role="group"
            aria-label="Add a node"
          >
            <span className="hidden items-center gap-1.5 border-r border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-400 xl:flex">
              <Plus className="size-3.5" aria-hidden /> Add node
            </span>
            <button
              type="button"
              onClick={() => addNode("jev")}
              className="toolbar-button hover:bg-violet-50 hover:text-violet-700"
            >
              <span className="toolbar-icon bg-violet-50 text-violet-600">
                <Sparkles className="size-4" />
              </span>{" "}
              Jev
            </button>
            <button
              type="button"
              onClick={() => addNode("llm")}
              className="toolbar-button hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="toolbar-icon bg-sky-50 text-sky-600">
                <Bot className="size-4" />
              </span>{" "}
              LLM
            </button>
            {nodes.some((node) => node.type === "output") ? null : (
              <button
                type="button"
                onClick={() => addNode("output")}
                className="toolbar-button hover:bg-emerald-50 hover:text-emerald-700"
              >
                <span className="toolbar-icon bg-emerald-50 text-emerald-600">
                  <FileOutput className="size-4" />
                </span>{" "}
                Output
              </button>
            )}
          </div>
        </Panel>
        <Panel position="top-center">
          <Toast message={toast} />
        </Panel>
        <Panel position="top-right" className="run-preview-panel">
          <RunPreviewBanner />
        </Panel>
      </ReactFlow>
    </div>
  );
}
