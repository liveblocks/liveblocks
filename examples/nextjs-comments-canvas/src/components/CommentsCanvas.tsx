import { Composer, Thread } from "@liveblocks/react-comments";
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
import { useCallback, useState } from "react";
import styles from "./CommentsCanvas.module.css";

export function CommentsCanvas() {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();

  // Allow click if moved less than 3px
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
    <div className={styles.wrapper}>
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        {threads.map((thread) => (
          <DraggableThread key={thread.id} thread={thread} />
        ))}
        <Composer className="composer" metadata={{ x: 200, y: 200 }} />
      </DndContext>
    </div>
  );
}

function DraggableThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  const [open, setOpen] = useState(false);
  const { user } = useUser(thread.comments[0].userId);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: thread.id,
    data: { thread },
  });

  // If currently dragging, add drag values to current metadata
  const x = transform ? transform.x + thread.metadata.x : thread.metadata.x;
  const y = transform ? transform.y + thread.metadata.y : thread.metadata.y;

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
          {user ? (
            <img
              src={user.avatar}
              alt={user.name}
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
