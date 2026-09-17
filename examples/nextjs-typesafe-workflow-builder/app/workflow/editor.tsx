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
import { Bot, Redo2, Sparkles, Undo2 } from "lucide-react";
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
  WORKFLOW_EDGE_TYPE,
  createJevNode,
  createLlmNode,
  createWorkflowEdge,
  getReachableNodeIds,
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

function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white shadow">
      {message}
    </div>
  );
}

export function WorkflowEditor({ className, ...props }: ComponentProps<"div">) {
  const reactFlow = useReactFlow<WorkflowNode, WorkflowEdge>();
  const { results, selectedRunId } = useRun();
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
  }, [undo, redo, canUndo, canRedo]);

  const reachable = useMemo(
    () => getReachableNodeIds(nodes, edges),
    [nodes, edges]
  );

  // Decorate edges with the selected run's path. Derived only; never written
  // back to Storage.
  const decoratedEdges = useMemo<WorkflowEdge[]>(() => {
    return edges.map((edge) => {
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
  }, [edges, results, reachable, selectedRunId]);

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

      // One edge per (source handle, target) pair.
      return !edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          edge.sourceHandle === connection.sourceHandle
      );
    },
    [edges]
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
          }),
        },
      ]);
    },
    [edges, onEdgesChange]
  );

  const addNode = useCallback(
    (kind: "jev" | "llm") => {
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
          : createLlmNode({ position, selected: true });

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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls
          orientation="horizontal"
          showInteractive={false}
          position="bottom-left"
        >
          <ControlButton onClick={undo} disabled={!canUndo} title="Undo">
            <Undo2 />
          </ControlButton>
          <ControlButton onClick={redo} disabled={!canRedo} title="Redo">
            <Redo2 />
          </ControlButton>
        </Controls>
        <Panel position="top-left">
          <div className="flex gap-1 rounded-lg bg-white p-1 shadow ring-1 ring-neutral-950/5">
            <button
              type="button"
              onClick={() => addNode("jev")}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-violet-50 hover:text-violet-700"
            >
              <Sparkles className="size-3.5 text-violet-600" /> Jev node
            </button>
            <button
              type="button"
              onClick={() => addNode("llm")}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-sky-50 hover:text-sky-700"
            >
              <Bot className="size-3.5 text-sky-600" /> LLM node
            </button>
          </div>
        </Panel>
        <Panel position="top-center">
          <Toast message={toast} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
