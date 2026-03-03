import { useMemo } from "react";
import { useEditThreadMetadata } from "@liveblocks/react/suspense";
import { FloatingThread, CommentPin } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/client";
import { useDraggable } from "@dnd-kit/core";
import { useMaxZIndex } from "../hooks";

// A draggable thread
export function DraggableThread({ thread }: { thread: ThreadData }) {
  // Open threads that have just been created
  const defaultOpen = useMemo(() => {
    return Number(new Date()) - Number(new Date(thread.createdAt)) <= 100;
  }, [thread]);

  // Enable drag
  const { isDragging, attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id: thread.id,
      data: { thread }, // Pass thread to DndContext drag end event
    });

  // If currently dragging, add drag values to current metadata
  const x = transform ? transform.x + thread.metadata.x : thread.metadata.x;
  const y = transform ? transform.y + thread.metadata.y : thread.metadata.y;

  // Used to set z-index higher than other threads when dragging
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex();

  return (
    <FloatingThread
      thread={thread}
      defaultOpen={defaultOpen}
      side="right"
      style={{ pointerEvents: isDragging ? "none" : "auto" }}
    >
      <div
        ref={setNodeRef}
        onPointerDown={() =>
          editThreadMetadata({
            threadId: thread.id,
            metadata: { zIndex: maxZIndex + 1 },
          })
        }
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          zIndex: thread.metadata?.zIndex || 0,
        }}
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
}
