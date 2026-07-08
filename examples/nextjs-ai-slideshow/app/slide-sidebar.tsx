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
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { patchIframeHtml } from "./iframe-html";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-html";
import { useSlideHtml } from "./slides";

const THUMBNAIL_WIDTH = 144;
const THUMBNAIL_HEIGHT = 81;
const THUMBNAIL_SCALE = THUMBNAIL_WIDTH / SLIDE_WIDTH;

type DisplaySlide = {
  id: string;
  proposalHtml?: string;
  isNewProposal?: boolean;
  hasProposal?: boolean;
};

export function SlideSidebar({
  slideIds,
  displaySlides,
  selectedSlideId,
  onSelectSlide,
  onAddSlide,
  onDeleteSlide,
  onMoveSlide,
}: {
  slideIds: string[];
  displaySlides: DisplaySlide[];
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
            {displaySlides.map((slide, index) =>
              slide.isNewProposal ? (
                <StaticSlideThumbnail
                  key={slide.id}
                  index={index}
                  html={slide.proposalHtml ?? ""}
                  selected={slide.id === selectedSlideId}
                  hasProposal={!!slide.hasProposal}
                  onSelect={() => onSelectSlide(slide.id)}
                />
              ) : (
                <SortableSlideThumbnail
                  key={slide.id}
                  id={slide.id}
                  index={index}
                  htmlOverride={slide.proposalHtml}
                  selected={slide.id === selectedSlideId}
                  canDelete={slideIds.length > 1}
                  hasProposal={!!slide.hasProposal}
                  onSelect={() => onSelectSlide(slide.id)}
                  onDelete={() => onDeleteSlide(slide.id)}
                />
              )
            )}
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
  htmlOverride,
  selected,
  canDelete,
  hasProposal,
  onSelect,
  onDelete,
}: {
  id: string;
  index: number;
  htmlOverride?: string;
  selected: boolean;
  canDelete: boolean;
  hasProposal: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const sharedHtml = useSlideHtml(id);
  const html = htmlOverride ?? sharedHtml;
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
        <ThumbnailFrame
          title={`Slide ${index + 1} thumbnail`}
          html={html}
          hasProposal={hasProposal}
        />
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

function StaticSlideThumbnail({
  index,
  html,
  selected,
  hasProposal,
  onSelect,
}: {
  index: number;
  html: string;
  selected: boolean;
  hasProposal: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          "block w-full rounded-lg border border-neutral-950/10 bg-white p-2 text-left shadow-xs transition hover:border-neutral-950/20",
          selected && "border-primary/30 ring-2 ring-primary/60"
        )}
        onClick={onSelect}
      >
        <ThumbnailFrame
          title={`New slide proposal ${index + 1} thumbnail`}
          html={html}
          hasProposal={hasProposal}
        />
        <span className="mt-2 flex items-center justify-between text-xs font-medium text-neutral-700">
          <span>Slide {index + 1}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            New
          </span>
        </span>
      </button>
    </div>
  );
}

function ThumbnailFrame({
  title,
  html,
  hasProposal,
}: {
  title: string;
  html: string;
  hasProposal: boolean;
}) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  // srcDoc is latched to the first value; later updates are patched into the
  // live document in place, so streaming edits don't reload (flash) the
  // thumbnail on every change.
  const initialHtmlRef = useRef(html);
  const appliedHtmlRef = useRef(html);

  useEffect(() => {
    if (iframe && html !== appliedHtmlRef.current) {
      patchIframeHtml(iframe, html);
      appliedHtmlRef.current = html;
    }
  }, [html, iframe]);

  return (
    <span
      className="relative block overflow-hidden rounded-md bg-white ring-1 ring-neutral-950/10"
      style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
    >
      <iframe
        ref={setIframe}
        title={title}
        width={SLIDE_WIDTH}
        height={SLIDE_HEIGHT}
        srcDoc={initialHtmlRef.current}
        sandbox="allow-same-origin"
        className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${THUMBNAIL_SCALE})`,
          transformOrigin: "top left",
        }}
      />
      {hasProposal ? (
        <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-primary shadow-sm ring-2 ring-white" />
      ) : null}
    </span>
  );
}
