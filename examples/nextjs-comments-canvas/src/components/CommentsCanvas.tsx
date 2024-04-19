import {
  Composer,
  InboxNotification,
  Thread,
} from "@liveblocks/react-comments";
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

export function CommentsCanvas() {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();

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

  const handleDragEnd = useCallback(({ active, delta }: DragEndEvent) => {
    const thread = (
      active.data as DataRef<{ thread: ThreadData<ThreadMetadata> }>
    ).current?.thread;

    if (!thread) {
      return;
    }

    const newX = (thread.metadata.x || 0) + delta.x;
    const newY = (thread.metadata.y || 0) + delta.y;
    editThreadMetadata({
      threadId: thread.id,
      metadata: { x: newX, y: newY },
    });
  }, []);

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      {threads.map((thread) => (
        <DraggableThread key={thread.id} thread={thread} />
      ))}
      <Composer className="composer" />
    </DndContext>
  );
}

function DraggableThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  const [open, setOpen] = useState(false);
  const creator = useUser(thread.comments[0].userId);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: thread.id,
    data: { thread },
  });

  const initialX = thread.metadata.x || 0;
  const initialY = thread.metadata.y || 0;
  const x = transform ? transform.x + initialX : initialX;
  const y = transform ? transform.y + initialY : initialY;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: 340,
      }}
    >
      <div {...listeners} {...attributes}>
        {open ? (
          <div onClick={() => setOpen(!open)}>avatar</div>
        ) : (
          <div onClick={() => setOpen(!open)}>handle</div>
        )}
      </div>
      {open ? <Thread thread={thread} className="thread" /> : null}
    </div>
  );
}
