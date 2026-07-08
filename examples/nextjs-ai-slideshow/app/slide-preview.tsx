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
  useOther,
  useOthers,
  useSelf,
  useThreads,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  CommentPin,
  Cursor,
  Cursors,
  type CursorsCursorProps,
  FloatingComposer,
  FloatingThread,
} from "@liveblocks/react-ui";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent, ReactNode } from "react";
import { EyeIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getElementByPath } from "./html-source-map";
import { patchIframeHtml } from "./iframe-html";
import type { SlideProposal } from "./proposal-actions";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-html";
import { useSlideUndo } from "./slide-undo";
import { useSlideHtml } from "./slides";
import { useVisualEditor } from "./visual-editor";

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
  proposalHtml,
  isNewProposal = false,
  resolvingProposal,
  onResolveProposal,
}: {
  slideId: string;
  placingComment: boolean;
  onPlacingDone: () => void;
  proposal: SlideProposal | null;
  proposalHtml?: string;
  isNewProposal?: boolean;
  resolvingProposal: "apply" | "reject" | null;
  onResolveProposal: (action: "apply" | "reject") => void;
}) {
  const documentHtml = useSlideHtml(slideId, !isNewProposal);
  // While previewing, pins stay hidden even on slides unaffected by the proposal
  // set because accept/reject resolves the whole set.
  const html = proposalHtml ?? documentHtml;
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [visualGestureActive, setVisualGestureActive] = useState(false);
  const [expectedVisualHtml, setExpectedVisualHtml] = useState<string | null>(
    null
  );
  const initialSrcDocRef = useRef({ slideId, html });
  const appliedHtmlRef = useRef(html);
  const latestHtmlRef = useRef(html);
  const pendingHtmlRef = useRef<string | null>(null);
  const expectedBaseHtmlRef = useRef<string | null>(null);
  const updateMyPresence = useUpdateMyPresence();
  const { undo, redo, stopCapturing } = useSlideUndo();
  const { threads } = useThreads();
  const slideThreads = useMemo(
    () => threads.filter((thread) => thread.metadata.slideId === slideId),
    [slideId, threads]
  );
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex(slideThreads);
  const { ref: wrapperRef, size: wrapperSize } = useElementSize();
  const [placedCoords, setPlacedCoords] = useState<Coords | null>(null);

  if (initialSrcDocRef.current.slideId !== slideId) {
    initialSrcDocRef.current = { slideId, html };
    appliedHtmlRef.current = html;
    pendingHtmlRef.current = null;
    expectedBaseHtmlRef.current = null;
  }

  useEffect(() => {
    latestHtmlRef.current = html;
  }, [html]);

  const handleVisualCommit = useCallback((expectedHtml: string) => {
    expectedBaseHtmlRef.current = latestHtmlRef.current;
    setExpectedVisualHtml(expectedHtml);
  }, []);

  const handleCursorMove = useCallback(
    (cursor: Coords | null) => {
      updateMyPresence({
        cursor,
        cursorSlideId: cursor ? slideId : null,
      });
    },
    [slideId, updateMyPresence]
  );

  const handleSelectionChange = useCallback(
    (path: number[] | null) => {
      updateMyPresence({
        selection: path ? { slideId, path } : null,
      });
    },
    [slideId, updateMyPresence]
  );

  useVisualEditor({
    iframe: proposal ? null : iframe,
    slideId,
    onGestureActiveChange: setVisualGestureActive,
    onCommit: handleVisualCommit,
    onCursorMove: handleCursorMove,
    onSelectionChange: handleSelectionChange,
    stopCapturing,
    onUndo: undo,
    onRedo: redo,
  });

  useEffect(() => {
    return () => {
      updateMyPresence({
        cursor: null,
        cursorSlideId: null,
        selection: null,
      });
    };
  }, [slideId, updateMyPresence]);

  useEffect(() => {
    if (proposal) {
      updateMyPresence({
        cursor: null,
        cursorSlideId: null,
        selection: null,
      });
    }
  }, [proposal, updateMyPresence]);

  useEffect(() => {
    if (!iframe || html === appliedHtmlRef.current) {
      return;
    }

    if (visualGestureActive) {
      pendingHtmlRef.current = html;
      return;
    }

    if (expectedVisualHtml !== null && html === expectedVisualHtml) {
      setExpectedVisualHtml(null);
      expectedBaseHtmlRef.current = null;
      appliedHtmlRef.current = html;
      return;
    }

    if (expectedVisualHtml !== null && html === expectedBaseHtmlRef.current) {
      return;
    }

    patchIframeHtml(iframe, html);
    pendingHtmlRef.current = null;
    appliedHtmlRef.current = html;
    setExpectedVisualHtml(null);
    expectedBaseHtmlRef.current = null;
  }, [expectedVisualHtml, html, iframe, visualGestureActive]);

  // Leave room around the slide so the shadow and proposal ring are visible
  // even when the slide would otherwise fit exactly edge-to-edge.
  const availableWidth = Math.max(1, wrapperSize.width - PREVIEW_INSET * 2);
  const availableHeight = Math.max(1, wrapperSize.height - PREVIEW_INSET * 2);
  const scale = Math.min(
    availableWidth / SLIDE_WIDTH,
    availableHeight / SLIDE_HEIGHT
  );
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const cursorComponents = useMemo(
    () => ({
      Cursor: function SlideCursorComponent(props: CursorsCursorProps) {
        return <SlideCursor {...props} slideId={slideId} scale={safeScale} />;
      },
    }),
    [safeScale, slideId]
  );

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
      {proposal && proposalHtml !== undefined ? (
        <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-primary/10 bg-white py-1.5 pl-4 pr-1.5 shadow-md">
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
          proposal && proposalHtml !== undefined
            ? "ring-2 ring-primary/60"
            : "ring-1 ring-neutral-950/10"
        }`}
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${safeScale})`,
          transformOrigin: "center",
        }}
      >
        <iframe
          key={slideId}
          ref={setIframe}
          title="Slide preview"
          width={SLIDE_WIDTH}
          height={SLIDE_HEIGHT}
          srcDoc={initialSrcDocRef.current.html}
          sandbox="allow-same-origin"
          className={cn(
            "absolute inset-0 h-full w-full border-0 bg-white",
            proposal ? "pointer-events-none" : "pointer-events-auto"
          )}
        />

        {!proposal ? (
          <>
            {/* `Cursors` must not be positioned absolute itself: its own
                `.lb-cursors` class sets `position: relative`, and it measures
                its OWN size to scale the normalized cursor coordinates — so
                it needs a full-size wrapper instead. */}
            <div className="pointer-events-none absolute inset-0 z-10">
              <Cursors
                className="h-full w-full"
                components={cursorComponents}
              />
            </div>

            <RemoteSelections
              iframe={iframe}
              slideId={slideId}
              scale={safeScale}
            />
          </>
        ) : null}

        {proposal ? null : (
          <div className="pointer-events-none absolute inset-0 z-20 isolate">
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

type CursorInfo = {
  cursorSlideId: string | null;
  name: string;
  color: string;
};

type RemoteSelectionRect = {
  connectionId: number;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function SlideCursor({
  connectionId,
  slideId,
  scale,
}: CursorsCursorProps & {
  slideId: string;
  scale: number;
}) {
  const info = useOther(
    connectionId,
    (other): CursorInfo => ({
      cursorSlideId: other.presence.cursorSlideId,
      name: other.info.name,
      color: other.info.color,
    }),
    cursorInfoEqual
  );

  if (info.cursorSlideId !== slideId) {
    return null;
  }

  return (
    <div
      style={{
        transform: `scale(${1 / scale})`,
        transformOrigin: "top left",
      }}
    >
      <Cursor color={info.color} label={info.name} />
    </div>
  );
}

function cursorInfoEqual(left: CursorInfo, right: CursorInfo): boolean {
  return (
    left.cursorSlideId === right.cursorSlideId &&
    left.name === right.name &&
    left.color === right.color
  );
}

function RemoteSelections({
  iframe,
  slideId,
  scale,
}: {
  iframe: HTMLIFrameElement | null;
  slideId: string;
  scale: number;
}) {
  const others = useOthers();
  const [rects, setRects] = useState<RemoteSelectionRect[]>([]);
  const visibleSelections = useMemo(
    () =>
      others.filter((other) => other.presence.selection?.slideId === slideId),
    [others, slideId]
  );

  const recomputeRects = useCallback(() => {
    const document = iframe?.contentDocument;
    const body = document?.body;
    if (!document || !body || visibleSelections.length === 0) {
      setRects([]);
      return;
    }

    const nextRects: RemoteSelectionRect[] = [];
    for (const other of visibleSelections) {
      const selection = other.presence.selection;
      if (!selection || selection.slideId !== slideId) {
        continue;
      }

      const element = getElementByPath(body, selection.path);
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      nextRects.push({
        connectionId: other.connectionId,
        name: other.info.name,
        color: other.info.color,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }

    setRects((previousRects) =>
      remoteSelectionRectsEqual(previousRects, nextRects)
        ? previousRects
        : nextRects
    );
  }, [iframe, slideId, visibleSelections]);

  useEffect(() => {
    recomputeRects();
    if (!iframe) {
      return;
    }

    iframe.addEventListener("load", recomputeRects);
    return () => {
      iframe.removeEventListener("load", recomputeRects);
    };
  }, [iframe, recomputeRects]);

  useEffect(() => {
    if (visibleSelections.length === 0) {
      setRects([]);
      return;
    }

    let frameId: number;
    const update = () => {
      recomputeRects();
      frameId = window.requestAnimationFrame(update);
    };

    update();
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [recomputeRects, visibleSelections.length]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {rects.map((rect) => (
        <div
          key={rect.connectionId}
          className="absolute"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            outline: `2px solid ${rect.color}`,
            outlineOffset: 2,
          }}
        >
          <div
            className="absolute -left-1 -top-1 rounded-t-sm px-1.5 py-0.5 pb-0 text-xs font-medium text-white"
            style={{
              backgroundColor: rect.color,
              transform: `translateY(-100%) scale(${1 / scale})`,
              transformOrigin: "bottom left",
            }}
          >
            {rect.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function remoteSelectionRectsEqual(
  left: RemoteSelectionRect[],
  right: RemoteSelectionRect[]
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftRect, index) => {
    const rightRect = right[index];
    return (
      rightRect !== undefined &&
      leftRect.connectionId === rightRect.connectionId &&
      leftRect.name === rightRect.name &&
      leftRect.color === rightRect.color &&
      Math.abs(leftRect.x - rightRect.x) < 0.1 &&
      Math.abs(leftRect.y - rightRect.y) < 0.1 &&
      Math.abs(leftRect.width - rightRect.width) < 0.1 &&
      Math.abs(leftRect.height - rightRect.height) < 0.1
    );
  });
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
        className="pointer-events-auto absolute"
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
