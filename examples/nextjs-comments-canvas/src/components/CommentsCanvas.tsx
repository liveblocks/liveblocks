import { Thread } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/core";
import { useThreads, useEditThreadMetadata } from "@liveblocks/react/suspense";
import { useUser } from "@liveblocks/react";
import {
  DataRef,
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect } from "react";
import styles from "./CommentsCanvas.module.css";
import { Toolbar } from "./Toolbar";
import { useMaxZIndex, useNearEdge } from "../hooks";
import { useActiveThread } from "./ActiveThreadProvider";

export function CommentsCanvas() {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();

  // Allow click event on avatar if thread moved less than 3px
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // On drag end, update thread metadata with new coords
  const handleDragEnd = useCallback(({ active, delta }: DragEndEvent) => {
    const thread = (active.data as DataRef<{ thread: ThreadData }>).current
      ?.thread;

    if (!thread) {
      return;
    }

    editThreadMetadata({
      threadId: thread.id,
      metadata: {
        x: thread.metadata.x + delta.x,
        y: thread.metadata.y + delta.y,
      },
    });
  }, []);

  return (
    <div className={`${styles.wrapper} lb-root`}>
      <div className={styles.threads}>
        <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
          {threads.map((thread) => (
            <DraggableThread key={thread.id} thread={thread} />
          ))}
        </DndContext>
      </div>
      <Toolbar />
    </div>
  );
}

// A draggable thread
function DraggableThread({ thread }: { thread: ThreadData }) {
  const { open, setOpen } = useActiveThread(thread.id);

  // Open threads that have just been created
  useEffect(() => {
    const justCreated =
      Number(new Date()) - Number(new Date(thread.createdAt)) <= 100;

    if (justCreated) {
      setOpen(true);
    }
  }, [thread, setOpen]);

  // Enable drag
  const { attributes, listeners, setNodeRef, transform, node } = useDraggable({
    id: thread.id,
    data: { thread }, // Pass thread to DndContext drag end event
  });

  // If currently dragging, add drag values to current metadata
  const x = transform ? transform.x + thread.metadata.x : thread.metadata.x;
  const y = transform ? transform.y + thread.metadata.y : thread.metadata.y;

  // Get the creator of the thread
  const { user: creator } = useUser(thread.comments[0].userId);

  // Used to set z-index higher than other threads when pointer down
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex();

  // Used to flip thread near edge of screen
  const { nearRightEdge, nearBottomEdge } = useNearEdge(node);

  return (
    <div
      ref={setNodeRef}
      className={styles.draggableThread}
      onPointerDown={() =>
        editThreadMetadata({
          threadId: thread.id,
          metadata: { zIndex: maxZIndex + 1 },
        })
      }
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        zIndex: thread.metadata?.zIndex || 0,
      }}
    >
      <div {...listeners} {...attributes}>
        <div className={styles.avatar} onClick={() => setOpen(!open)}>
          {creator ? (
            <img
              src={creator.avatar}
              alt={creator.name}
              width="28px"
              height="28px"
              draggable={false}
            />
          ) : (
            <div />
          )}
        </div>
      </div>
      <Thread
        style={open ? undefined : { display: "none" }}
        thread={thread}
        className="thread"
        data-flip-vertical={nearBottomEdge || undefined}
        data-flip-horizontal={nearRightEdge || undefined}
      />
    </div>
  );
}
