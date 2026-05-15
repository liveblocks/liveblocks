"use client";

import type { ThreadData } from "@liveblocks/client";
import { useSelf } from "@liveblocks/react";
import {
  useCreateThread,
  useEditThreadMetadata,
  useThreads,
} from "@liveblocks/react/suspense";
import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
  Icon,
  type CommentProps,
} from "@liveblocks/react-ui";
import { FlowchartThreadComment } from "./ai-comments";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useNodes, useStore, useStoreApi } from "@xyflow/react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  flowPointToNormalized,
  getNodeAtFlowPoint,
  normalizedToFlowPoint,
  type FlowchartEdge,
  type FlowchartNode,
  type Point,
} from "./shared";

export type ThreadPinPlacement =
  | { kind: "canvas"; flow: Point }
  | {
      kind: "block";
      nodeId: string;
      normalized: Point;
    };

export type CommentPlacementMode =
  | { kind: "idle" }
  | { kind: "placing-comment"; pointer: Point }
  | { kind: "composing-comment"; placement: ThreadPinPlacement };

function isThreadAttachedToMissingNode(
  thread: ThreadData,
  nodes: FlowchartNode[]
): boolean {
  const attachedToNodeId = thread.metadata.attachedToNodeId;

  if (attachedToNodeId == null) {
    return false;
  }

  return !nodes.some((node) => node.id === attachedToNodeId);
}

export function getThreadPinFlowPosition(
  thread: ThreadData,
  nodes: FlowchartNode[]
): Point {
  const { x, y, attachedToNodeId } = thread.metadata;

  if (attachedToNodeId != null) {
    const node = nodes.find((node) => node.id === attachedToNodeId);

    if (node) {
      return normalizedToFlowPoint(node, { x, y });
    }
  }

  return { x, y };
}

export function getPlacementAtFlowPoint(
  nodes: FlowchartNode[],
  flowPosition: Point
): ThreadPinPlacement {
  const hit = getNodeAtFlowPoint(nodes, flowPosition);

  if (!hit) {
    return { kind: "canvas", flow: flowPosition };
  }

  const normalized = flowPointToNormalized(
    hit,
    flowPosition.x,
    flowPosition.y
  );

  return {
    kind: "block",
    nodeId: hit.id,
    normalized,
  };
}

function getThreadMetadataForPlacement(
  placement: ThreadPinPlacement
): ThreadData["metadata"] {
  if (placement.kind === "canvas") {
    return {
      x: placement.flow.x,
      y: placement.flow.y,
    };
  }

  return {
    attachedToNodeId: placement.nodeId,
    x: placement.normalized.x,
    y: placement.normalized.y,
  };
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

const DraggableFlowThread = memo(function DraggableFlowThread({
  thread,
  defaultOpen,
}: {
  thread: ThreadData;
  defaultOpen: boolean;
}) {
  const nodes = useNodes<FlowchartNode>();
  const transform = useStore((state) => state.transform);
  const [panX, panY, zoom] = transform;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform: dragDelta,
  } = useDraggable({
    id: thread.id,
    data: { thread },
  });

  const { x: flowX, y: flowY } = useMemo(
    () => getThreadPinFlowPosition(thread, nodes),
    [thread, nodes]
  );

  const x = flowX * zoom + panX + (dragDelta?.x ?? 0);
  const y = flowY * zoom + panY + (dragDelta?.y ?? 0);

  const handleWheel = useCallback((event: ReactWheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  if (isThreadAttachedToMissingNode(thread, nodes)) {
    return null;
  }

  return (
    <FloatingThread
      thread={thread}
      open={isOpen}
      onOpenChange={setIsOpen}
      defaultOpen={defaultOpen}
      side="right"
      style={{ pointerEvents: isDragging ? "none" : "auto" }}
      components={{
        Comment: (commentProps: CommentProps) => (
          <FlowchartThreadComment {...commentProps} />
        ),
      }}
    >
      <div
        ref={setNodeRef}
        className="flowchart-flow-comment-pin-wrap nodrag nopan"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          pointerEvents: "auto",
        }}
        onWheel={handleWheel}
      >
        <CommentPin
          userId={thread.comments[0]?.userId}
          corner="top-left"
          {...listeners}
          {...attributes}
        />
      </div>
    </FloatingThread>
  );
});

function NewThreadCursor({ pointer }: { pointer: Point }) {
  const position = usePointerPosition(pointer);

  return (
    <CommentPin
      corner="top-left"
      style={{
        cursor: "none",
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 999999,
        pointerEvents: "none",
      }}
    />
  );
}

function ThreadComposer({
  placement,
  onSubmit,
  onThreadCreated,
}: {
  placement: ThreadPinPlacement;
  onSubmit: () => void;
  onThreadCreated: (threadId: string) => void;
}) {
  const createThread = useCreateThread();
  const creatorId = useSelf((me) => me.id);
  const nodes = useNodes<FlowchartNode>();
  const transform = useStore((state) => state.transform);
  const [panX, panY, zoom] = transform;

  const composerMetadata = useMemo(
    () => getThreadMetadataForPlacement(placement),
    [placement]
  );

  const { x, y } = useMemo(() => {
    if (placement.kind === "canvas") {
      return {
        x: placement.flow.x * zoom + panX,
        y: placement.flow.y * zoom + panY,
      };
    }

    const node = nodes.find((item) => item.id === placement.nodeId);

    if (node) {
      const point = normalizedToFlowPoint(node, placement.normalized);

      return {
        x: point.x * zoom + panX,
        y: point.y * zoom + panY,
      };
    }

    return { x: 0, y: 0 };
  }, [placement, nodes, zoom, panX, panY]);

  return (
    <div
      className="flowchart-thread-composer-anchor nodrag nopan"
      style={{
        position: "absolute",
        top: y,
        left: x,
        pointerEvents: "auto",
      }}
    >
      <FloatingComposer
        defaultOpen
        metadata={composerMetadata}
        onComposerSubmit={(comment, event) => {
          event.preventDefault();

          const thread = createThread({
            body: comment.body,
            metadata: composerMetadata,
            attachments: comment.attachments,
          });

          onThreadCreated(thread.id);
          onSubmit();
        }}
        onOpenChange={(open) => {
          if (!open) {
            onSubmit();
          }
        }}
        side="right"
      >
        <div className="flowchart-flow-comment-pin-wrap nodrag nopan">
          <CommentPin
            userId={creatorId ?? undefined}
            corner="top-left"
            className="nodrag nopan"
            style={{ pointerEvents: "none" }}
          />
        </div>
      </FloatingComposer>
    </div>
  );
}

function PlaceThreadControl({
  mode,
  onCancel,
  onThreadCreated,
}: {
  mode: CommentPlacementMode;
  onCancel: () => void;
  onThreadCreated: (threadId: string) => void;
}) {
  if (mode.kind === "placing-comment") {
    return <NewThreadCursor pointer={mode.pointer} />;
  }

  if (mode.kind === "composing-comment") {
    return (
      <ThreadComposer
        placement={mode.placement}
        onSubmit={onCancel}
        onThreadCreated={onThreadCreated}
      />
    );
  }

  return null;
}

export function FlowchartCommentToolbarButton({
  onAddComment,
}: {
  onAddComment: (pointer: Point) => void;
}) {
  return (
    <CommentPin
      className="flowchart-toolbar-item-comment"
      corner="top-left"
      size={32}
      title="Add comment"
      aria-label="Add comment"
      onClick={(event) =>
        onAddComment({ x: event.clientX, y: event.clientY })
      }
    >
      <Icon.Plus />
    </CommentPin>
  );
}

export function FlowchartCanvasComments({
  children,
  commentMode,
  onCancelPlacement,
}: {
  children: ReactNode;
  commentMode: CommentPlacementMode;
  onCancelPlacement: () => void;
}) {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const storeApi = useStoreApi<FlowchartNode, FlowchartEdge>();
  const [threadIdsOpenByDefault, setThreadIdsOpenByDefault] = useState(
    () => new Set<string>()
  );

  const registerThreadOpenByDefault = useCallback((threadId: string) => {
    setThreadIdsOpenByDefault((prev) => new Set(prev).add(threadId));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const data = active.data.current;
      const thread = data?.thread as ThreadData | undefined;

      if (thread) {
        const [, , zoom] = storeApi.getState().transform;
        const nodes = storeApi.getState().nodes;
        const dx = delta.x / zoom;
        const dy = delta.y / zoom;

        const start = getThreadPinFlowPosition(thread, nodes);
        const finalFlowPosition = { x: start.x + dx, y: start.y + dy };

        const hit = getNodeAtFlowPoint(nodes, finalFlowPosition);

        if (hit) {
          const normalized = flowPointToNormalized(
            hit,
            finalFlowPosition.x,
            finalFlowPosition.y
          );

          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: hit.id,
              x: normalized.x,
              y: normalized.y,
            },
          });
        } else {
          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: undefined,
              x: finalFlowPosition.x,
              y: finalFlowPosition.y,
            },
          });
        }
      }
    },
    [editThreadMetadata, storeApi]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
      <div className="flowchart-comments">
        {threads.map((thread) => (
          <DraggableFlowThread
            key={thread.id}
            thread={thread}
            defaultOpen={threadIdsOpenByDefault.has(thread.id)}
          />
        ))}
        <PlaceThreadControl
          mode={commentMode}
          onCancel={onCancelPlacement}
          onThreadCreated={registerThreadOpenByDefault}
        />
      </div>
    </DndContext>
  );
}
