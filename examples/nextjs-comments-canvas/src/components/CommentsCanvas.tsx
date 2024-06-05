import { Thread } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/core";
import {
  ThreadMetadata,
  useThreads,
  useEditThreadMetadata,
  useUser,
} from "../../liveblocks.config";
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
import { useCallback, useMemo, useState } from "react";
import styles from "./CommentsCanvas.module.css";
import { Toolbar } from "./Toolbar";

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
    const thread = (
      active.data as DataRef<{ thread: ThreadData<ThreadMetadata> }>
    ).current?.thread;

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
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        {threads.map((thread) => (
          <DraggableThread key={thread.id} thread={thread} />
        ))}
      </DndContext>
      <Toolbar />
    </div>
  );
}

// A draggable thread
function DraggableThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  // Open threads that have just been created
  const startOpen = useMemo(() => {
    return Number(new Date()) - Number(new Date(thread.createdAt)) <= 100;
  }, [thread]);
  const [open, setOpen] = useState(startOpen);

  // Enable drag
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: thread.id,
    data: { thread }, // Pass thread to DndContext drag end event
  });

  // If currently dragging, add drag values to current metadata
  const x = transform ? transform.x + thread.metadata.x : thread.metadata.x;
  const y = transform ? transform.y + thread.metadata.y : thread.metadata.y;

  // Get the creator of the thread
  const { user: creator } = useUser(thread.comments[0].userId);

  return (
    <div
      ref={setNodeRef}
      className={styles.draggableThread}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
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
      {open ? <Thread thread={thread} className="thread" /> : null}
    </div>
  );
}
