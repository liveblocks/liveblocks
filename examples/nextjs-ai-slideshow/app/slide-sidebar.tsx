"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-html";
import { useSlideHtml } from "./slides";

const THUMBNAIL_WIDTH = 144;
const THUMBNAIL_HEIGHT = 81;
const THUMBNAIL_SCALE = THUMBNAIL_WIDTH / SLIDE_WIDTH;

export function SlideSidebar({
  slideIds,
  selectedSlideId,
  onSelectSlide,
  onAddSlide,
  onDeleteSlide,
  onMoveSlide,
}: {
  slideIds: string[];
  selectedSlideId: string;
  onSelectSlide: (id: string) => void;
  onAddSlide: () => void;
  onDeleteSlide: (id: string) => void;
  onMoveSlide: (fromIndex: number, toIndex: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = slideIds.indexOf(String(active.id));
    const toIndex = slideIds.indexOf(String(over.id));
    onMoveSlide(fromIndex, toIndex);
  };

  return (
    <aside className="flex w-48 shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
      <div className="border-b border-neutral-950/5 px-3 py-2">
        <h2 className="text-sm font-medium text-neutral-900">Slides</h2>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slideIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
            {slideIds.map((id, index) => (
              <SortableSlideThumbnail
                key={id}
                id={id}
                index={index}
                selected={id === selectedSlideId}
                canDelete={slideIds.length > 1}
                onSelect={() => onSelectSlide(id)}
                onDelete={() => onDeleteSlide(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="border-t border-neutral-950/5 p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddSlide}
        >
          <PlusIcon className="size-4" />
          Add slide
        </Button>
      </div>
    </aside>
  );
}

function SortableSlideThumbnail({
  id,
  index,
  selected,
  canDelete,
  onSelect,
  onDelete,
}: {
  id: string;
  index: number;
  selected: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const html = useSlideHtml(id);
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("group relative", isDragging && "z-10 opacity-60")}
    >
      <button
        type="button"
        className={cn(
          "block w-full rounded-lg border border-neutral-950/10 bg-white p-2 text-left shadow-xs transition hover:border-neutral-950/20",
          selected && "border-primary/30 ring-2 ring-primary/60"
        )}
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        <span
          className="relative block overflow-hidden rounded-md bg-white ring-1 ring-neutral-950/10"
          style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
        >
          <iframe
            title={`Slide ${index + 1} thumbnail`}
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            srcDoc={html}
            sandbox="allow-same-origin"
            className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              transform: `scale(${THUMBNAIL_SCALE})`,
              transformOrigin: "top left",
            }}
          />
        </span>
        <span className="mt-2 block text-xs font-medium text-neutral-700">
          Slide {index + 1}
        </span>
      </button>

      <Button
        type="button"
        variant="secondary"
        size="icon-xs"
        className={cn(
          "absolute right-1.5 top-1.5 opacity-0 shadow-sm transition group-hover:opacity-100",
          !canDelete && "hidden"
        )}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        disabled={!canDelete}
        aria-label={`Delete slide ${index + 1}`}
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
}
