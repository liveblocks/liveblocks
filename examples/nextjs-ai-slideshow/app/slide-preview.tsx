"use client";

import type { ThreadData } from "@liveblocks/client";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  useEditThreadMetadata,
  useSelf,
  useThreads,
} from "@liveblocks/react/suspense";
import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
} from "@liveblocks/react-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { EyeIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SlideProposal } from "./proposal-actions";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-html";
import { useSlideHtml } from "./slides";

type Coords = { x: number; y: number };

type Size = { width: number; height: number };

const PREVIEW_INSET = 16;

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function useElementSize() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  });

  useEffect(() => {
    if (!node) {
      return;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return { ref: setNode, size };
}

function useMaxZIndex(threads: readonly ThreadData[]) {
  return useMemo(() => {
    let max = 0;
    for (const thread of threads) {
      if (thread.metadata.zIndex > max) {
        max = thread.metadata.zIndex;
      }
    }
    return max;
  }, [threads]);
}

export function SlidePreview({
  slideId,
  placingComment,
  onPlacingDone,
  proposal,
  resolvingProposal,
  onResolveProposal,
}: {
  slideId: string;
  placingComment: boolean;
  onPlacingDone: () => void;
  proposal: SlideProposal | null;
  resolvingProposal: "apply" | "reject" | null;
  onResolveProposal: (action: "apply" | "reject") => void;
}) {
  const documentHtml = useSlideHtml(slideId);
  // While previewing a proposal, the slide shows the proposed HTML instead of
  // the shared document, and comment pins are hidden (they belong to the
  // shared slide, not to an unapplied proposal).
  const html = proposal ? proposal.html : documentHtml;
  const { threads } = useThreads();
  const slideThreads = useMemo(
    () => threads.filter((thread) => thread.metadata.slideId === slideId),
    [slideId, threads]
  );
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex(slideThreads);
  const { ref: wrapperRef, size: wrapperSize } = useElementSize();
  const [placedCoords, setPlacedCoords] = useState<Coords | null>(null);

  // Leave room around the slide so the shadow and proposal ring are visible
  // even when the slide would otherwise fit exactly edge-to-edge.
  const availableWidth = Math.max(1, wrapperSize.width - PREVIEW_INSET * 2);
  const availableHeight = Math.max(1, wrapperSize.height - PREVIEW_INSET * 2);
  const scale = Math.min(
    availableWidth / SLIDE_WIDTH,
    availableHeight / SLIDE_HEIGHT
  );
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 3 },
    })
  );

  const resetPlacement = useCallback(() => {
    setPlacedCoords(null);
    onPlacingDone();
  }, [onPlacingDone]);

  const handleDragEnd = useCallback(
    ({ active, delta }: DragEndEvent) => {
      const thread = slideThreads.find((item) => item.id === String(active.id));
      if (!thread) {
        return;
      }

      const nextX = clampPercentage(
        thread.metadata.x + (delta.x / (SLIDE_WIDTH * safeScale)) * 100
      );
      const nextY = clampPercentage(
        thread.metadata.y + (delta.y / (SLIDE_HEIGHT * safeScale)) * 100
      );

      editThreadMetadata({
        threadId: thread.id,
        metadata: {
          x: nextX,
          y: nextY,
          zIndex: maxZIndex + 1,
          slideId,
        },
      });
    },
    [editThreadMetadata, maxZIndex, safeScale, slideId, slideThreads]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden bg-neutral-50"
    >
      {proposal ? (
        <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-primary/30 bg-white py-1.5 pl-4 pr-1.5 shadow-md">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-neutral-700">
            <EyeIcon className="size-4 text-primary" />
            Previewing proposed slide
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolveProposal("reject")}
              disabled={resolvingProposal !== null}
              className="rounded-full"
            >
              {resolvingProposal === "reject" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Reject
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => onResolveProposal("apply")}
              disabled={resolvingProposal !== null}
            >
              {resolvingProposal === "apply" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Accept
            </Button>
          </div>
        </div>
      ) : null}
      <div
        className={`absolute left-1/2 top-1/2 overflow-visible bg-white shadow-2xl ${
          proposal ? "ring-2 ring-primary/60" : "ring-1 ring-neutral-950/10"
        }`}
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${safeScale})`,
          transformOrigin: "center",
        }}
      >
        <iframe
          title="Slide preview"
          width={SLIDE_WIDTH}
          height={SLIDE_HEIGHT}
          srcDoc={html}
          sandbox="allow-same-origin"
          className="absolute inset-0 h-full w-full border-0 bg-white pointer-events-none"
        />

        {proposal ? null : (
          <div className="absolute inset-0 isolate">
            <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
              {slideThreads.map((thread) => (
                <DraggableSlideThread
                  key={thread.id}
                  thread={thread}
                  maxZIndex={maxZIndex}
                  scale={safeScale}
                />
              ))}
            </DndContext>
          </div>
        )}

        {!proposal && (placingComment || placedCoords) ? (
          <button
            type="button"
            aria-label="Cancel comment placement"
            className="absolute inset-0 z-20 bg-neutral-950/10"
            onClick={resetPlacement}
            onContextMenu={(event) => {
              event.preventDefault();
              resetPlacement();
            }}
          />
        ) : null}

        {!proposal && placingComment ? (
          <PlacementOverlay
            scale={safeScale}
            onPlace={(coords) => {
              setPlacedCoords(coords);
              onPlacingDone();
            }}
            onCancel={resetPlacement}
          />
        ) : null}

        {!proposal && placedCoords ? (
          <ThreadComposer
            coords={placedCoords}
            scale={safeScale}
            slideId={slideId}
            maxZIndex={maxZIndex}
            onSubmit={resetPlacement}
          />
        ) : null}
      </div>
    </div>
  );
}

function DraggableSlideThread({
  thread,
  maxZIndex,
  scale,
}: {
  thread: ThreadData;
  maxZIndex: number;
  scale: number;
}) {
  const defaultOpen = useMemo(() => {
    return Date.now() - new Date(thread.createdAt).getTime() <= 100;
  }, [thread.createdAt]);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useDraggable({ id: thread.id });

  const currentZIndex =
    isOpen || isDragging ? maxZIndex + 1 : thread.metadata.zIndex;
  const dragX = transform ? transform.x / scale : 0;
  const dragY = transform ? transform.y / scale : 0;

  return (
    <FloatingThread
      thread={thread}
      open={isOpen}
      onOpenChange={setIsOpen}
      defaultOpen={defaultOpen}
      side="right"
      style={{ pointerEvents: isDragging ? "none" : "auto" }}
    >
      <div
        ref={setNodeRef}
        className="absolute"
        style={{
          left: `${thread.metadata.x}%`,
          top: `${thread.metadata.y}%`,
          transform: `translate3d(${dragX}px, ${dragY}px, 0)`,
          zIndex: currentZIndex,
        }}
      >
        <UnscaledPin scale={scale}>
          <CommentPin
            userId={thread.comments[0]?.userId}
            corner="top-left"
            {...listeners}
            {...attributes}
          />
        </UnscaledPin>
      </div>
    </FloatingThread>
  );
}

function ThreadComposer({
  coords,
  scale,
  slideId,
  maxZIndex,
  onSubmit,
}: {
  coords: Coords;
  scale: number;
  slideId: string;
  maxZIndex: number;
  onSubmit: () => void;
}) {
  const creatorId = useSelf((me) => me.id);

  return (
    <FloatingComposer
      defaultOpen={true}
      metadata={{
        x: coords.x,
        y: coords.y,
        zIndex: maxZIndex + 1,
        slideId,
      }}
      onComposerSubmit={onSubmit}
    >
      <div
        className="absolute"
        style={{
          left: `${coords.x}%`,
          top: `${coords.y}%`,
          zIndex: Math.max(maxZIndex + 1, 40),
        }}
      >
        <UnscaledPin scale={scale}>
          <CommentPin userId={creatorId ?? undefined} corner="top-left" />
        </UnscaledPin>
      </div>
    </FloatingComposer>
  );
}

// The slide container is scaled with `transform: scale()`, which would shrink
// or enlarge pins along with the slide. Pins should stay a constant on-screen
// size, so this wrapper applies the inverse scale.
function UnscaledPin({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{ transform: `scale(${1 / scale})`, transformOrigin: "top left" }}
    >
      {children}
    </div>
  );
}

// Overlay shown while placing a comment: tracks the cursor with a ghost pin
// and turns a click into percentage coordinates. Coordinates are computed
// from the overlay's bounding rect, so they stay correct regardless of the
// slide's current `transform: scale()`. (The pin can't be `position: fixed`
// with viewport coordinates like in the comments-canvas example, because the
// scaled ancestor changes the containing block for fixed elements.)
function PlacementOverlay({
  scale,
  onPlace,
  onCancel,
}: {
  scale: number;
  onPlace: (coords: Coords) => void;
  onCancel: () => void;
}) {
  const [cursor, setCursor] = useState<Coords | null>(null);

  const toPercentages = (event: MouseEvent<HTMLDivElement>): Coords => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clampPercentage(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercentage(((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  return (
    <div
      className="absolute inset-0 z-30 cursor-none"
      onMouseMove={(event) => setCursor(toPercentages(event))}
      onMouseLeave={() => setCursor(null)}
      onClick={(event) => onPlace(toPercentages(event))}
      onContextMenu={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      {cursor ? (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        >
          <UnscaledPin scale={scale}>
            <CommentPin corner="top-left" />
          </UnscaledPin>
        </div>
      ) : null}
    </div>
  );
}
