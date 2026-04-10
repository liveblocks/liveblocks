import { ThreadData } from "@liveblocks/client";
import { useThreads, useEditThreadMetadata } from "@liveblocks/react/suspense";
import {
  DataRef,
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback } from "react";
import { PlaceThreadButton } from "./PlaceThreadButton";
import { DraggableThread } from "./DraggableThread";
import { useMaxZIndex } from "../hooks";

export function CommentsCanvas() {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex();

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

  // On drag end, update thread metadata with new coords and highest z-index
  const handleDragEnd = useCallback(
    ({ active, delta }: DragEndEvent) => {
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
          zIndex: maxZIndex + 1,
        },
      });
    },
    [editThreadMetadata, maxZIndex]
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ isolation: "isolate" }}>
        <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
          {threads.map((thread) => (
            <DraggableThread key={thread.id} thread={thread} />
          ))}
        </DndContext>
      </div>
      <PlaceThreadButton />
    </div>
  );
}
