"use client";

import { shallow } from "@liveblocks/client";
import {
  ClientSideSuspense,
  useCanRedo,
  useCanUndo,
  useHistory,
  useOthersMapped,
  useRedo,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  AudioLinesIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  LockIcon,
  MagnetIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Redo2Icon,
  ScissorsIcon,
  ShrinkIcon,
  Trash2Icon,
  Undo2Icon,
  UnlockIcon,
  Volume2Icon,
  VolumeXIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useEditorUi } from "@/components/editor-context";
import { LIBRARY_DRAG_TYPE } from "@/components/library/media-library";
import {
  CLIP_INSET,
  HEADER_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
  ROW_HEIGHT,
  RULER_HEIGHT,
  SNAP_PIXELS,
  type ClipDragMode,
} from "@/components/timeline/constants";
import {
  OtherCursors,
  OtherPlayheads,
  Playhead,
} from "@/components/timeline/playheads";
import { CommentMarkers, RulerTicks } from "@/components/timeline/ruler";
import {
  TimelineClip,
  type ClipPointerDown,
  type RemoteSelection,
} from "@/components/timeline/timeline-clip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { TooltipButton } from "@/components/ui/tooltip-button";
import {
  libraryItemDuration,
  libraryItemType,
  useClips,
  useEditorActions,
  useSelection,
  useTracks,
  type LibraryItem,
} from "@/hooks/use-editor";
import { usePlayback, usePlaybackDuration } from "@/hooks/use-playback";
import {
  MIN_CLIP_DURATION,
  trackAccepts,
  type Clip,
  type ClipType,
  type Track,
} from "@/lib/project";
import {
  clipEnd,
  findSnap,
  maxClipDuration,
  nearestFreeStart,
  neighborBounds,
  snapToFrame,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

type Row = { track: Track; top: number; height: number };
type DropPreview = {
  trackId: string | "new";
  start: number;
  duration: number;
  type: ClipType;
};

const NEW_TRACK_HEIGHT = 44;

function zoomToSlider(zoom: number) {
  return Math.log(zoom / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM);
}

function sliderToZoom(value: number) {
  return MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, value);
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("input, textarea, select, [contenteditable='true']") !==
        null)
  );
}

function parseLibraryItem(event: DragEvent): LibraryItem | null {
  try {
    const value: unknown = JSON.parse(
      event.dataTransfer.getData(LIBRARY_DRAG_TYPE)
    );
    if (typeof value !== "object" || value === null || !("kind" in value))
      return null;
    if (
      value.kind === "asset" &&
      "assetId" in value &&
      typeof value.assetId === "string"
    ) {
      return { kind: "asset", assetId: value.assetId };
    }
    if (
      value.kind === "text" &&
      "textStyle" in value &&
      (value.textStyle === "title" ||
        value.textStyle === "subtitle" ||
        value.textStyle === "lower-third" ||
        value.textStyle === "caption")
    ) {
      return { kind: "text", textStyle: value.textStyle };
    }
  } catch {
    // Not one of ours.
  }
  return null;
}

export function Timeline() {
  const tracks = useTracks();
  const clips = useClips();
  const [selection, setSelection] = useSelection();
  const actions = useEditorActions();
  const { updateClip, addLibraryItem } = actions;
  const ui = useEditorUi();
  const { snapping, draggedItem, setSidePanelTab } = ui;
  const playback = usePlayback();
  const duration = usePlaybackDuration();
  const history = useHistory();
  const updateMyPresence = useUpdateMyPresence();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoomState, setZoom] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const pendingScroll = useRef<number | null>(null);

  const zoom = zoomState ?? 40;

  // Start zoomed to fit the whole edit, once we know how wide we are.
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setViewportWidth(element.clientWidth)
    );
    observer.observe(element);
    setViewportWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  const fitZoom = useCallback(
    () =>
      Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          (viewportWidth - HEADER_WIDTH - 48) / Math.max(1, duration)
        )
      ),
    [viewportWidth, duration]
  );

  useLayoutEffect(() => {
    if (zoomState === null && viewportWidth > 0 && duration > 0) {
      setZoom(fitZoom());
    }
  }, [zoomState, viewportWidth, duration, fitZoom]);

  // Zooming keeps the moment under the pointer (or the playhead) in place.
  const zoomTo = useCallback(
    (next: number, anchorClientX?: number) => {
      const scroller = scrollerRef.current;
      const content = contentRef.current;
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      if (!scroller || !content) {
        setZoom(clamped);
        return;
      }
      const rect = content.getBoundingClientRect();
      const anchorTime =
        anchorClientX !== undefined
          ? (anchorClientX - rect.left - HEADER_WIDTH) / zoom
          : playback.time;
      const viewportOffset =
        HEADER_WIDTH + anchorTime * zoom - scroller.scrollLeft;
      pendingScroll.current =
        HEADER_WIDTH + anchorTime * clamped - viewportOffset;
      setZoom(clamped);
    },
    [zoom, playback]
  );

  useLayoutEffect(() => {
    if (pendingScroll.current !== null && scrollerRef.current) {
      scrollerRef.current.scrollLeft = Math.max(0, pendingScroll.current);
      pendingScroll.current = null;
    }
  }, [zoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomTo(zoom * Math.exp(-event.deltaY * 0.01), event.clientX);
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [zoom, zoomTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey)
        return;
      if (event.key === "=" || event.key === "+") zoomTo(zoom * 1.4);
      if (event.key === "-" || event.key === "_") zoomTo(zoom / 1.4);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoom, zoomTo]);

  // Keep the playhead in view: page along while playing, and scroll to it
  // when jumping somewhere (a comment, a collaborator, the start or end).
  useEffect(() => {
    let lastReveal = playback.revealId;
    return playback.subscribe(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const x = playback.time * zoom;
      const visible = scroller.clientWidth - HEADER_WIDTH;
      const reveal = playback.revealId !== lastReveal;
      lastReveal = playback.revealId;
      if (
        reveal &&
        (x < scroller.scrollLeft || x > scroller.scrollLeft + visible - 32)
      ) {
        scroller.scrollTo({
          left: Math.max(0, x - visible * 0.3),
          behavior: "smooth",
        });
      } else if (playback.playing && x > scroller.scrollLeft + visible - 24) {
        scroller.scrollLeft = x - 48;
      }
    });
  }, [playback, zoom]);

  const rows = useMemo<Row[]>(() => {
    let top = 0;
    return tracks.map((track) => {
      const row = { track, top, height: ROW_HEIGHT[track.kind] };
      top += row.height;
      return row;
    });
  }, [tracks]);
  const seconds = Math.max(
    duration + 20,
    (viewportWidth - HEADER_WIDTH) / zoom
  );
  const contentWidth = HEADER_WIDTH + seconds * zoom;

  const others = useOthersMapped(
    (other) => ({
      selection: other.presence.selectedClipIds,
      name: other.info.name,
      color: other.info.color,
      avatar: other.info.avatar,
    }),
    shallow
  );
  const remoteSelections = useMemo(() => {
    const map = new Map<string, RemoteSelection[]>();
    for (const [, { selection, ...user }] of others) {
      for (const clipId of selection) {
        map.set(clipId, [...(map.get(clipId) ?? []), user]);
      }
    }
    return map;
  }, [others]);

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = contentRef.current?.getBoundingClientRect();
      return rect ? (clientX - rect.left - HEADER_WIDTH) / zoom : 0;
    },
    [zoom]
  );

  const rowAt = useCallback(
    (clientY: number) => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return undefined;
      const y = clientY - rect.top - RULER_HEIGHT;
      return rows.find((row) => y >= row.top && y < row.top + row.height);
    },
    [rows]
  );

  const snapTargets = useCallback(
    (exclude?: string) => {
      const targets = [0, playback.time];
      for (const clip of clips) {
        if (clip.id === exclude) continue;
        targets.push(clip.start, clipEnd(clip));
      }
      return targets;
    },
    [clips, playback]
  );

  // Clicking the ruler or an empty spot moves the playhead, and dragging
  // scrubs.
  const beginScrub = useCallback(
    (event: ReactPointerEvent) => {
      if (event.button !== 0) return;
      playback.pause();
      const seekTo = (clientX: number) =>
        playback.seek(snapToFrame(timeAt(clientX)));
      seekTo(event.clientX);
      const onMove = (move: PointerEvent) => seekTo(move.clientX);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [playback, timeAt]
  );

  /**
   * Moving and trimming. Every pointer move writes straight to Storage, so
   * collaborators watch the clip move; history is paused for the drag so it
   * undoes in one step.
   */
  const onClipPointerDown = useCallback<ClipPointerDown>(
    (event, clip, mode: ClipDragMode) => {
      if (event.button !== 0) return;
      event.stopPropagation();

      if (event.shiftKey || event.metaKey) {
        setSelection(
          selection.includes(clip.id)
            ? selection.filter((id) => id !== clip.id)
            : [...selection, clip.id]
        );
        return;
      }
      if (!selection.includes(clip.id) || mode !== "move") {
        setSelection([clip.id]);
      }

      const track = tracks.find((track) => track.id === clip.trackId);
      if (!track || track.locked) return;

      const origin = { x: event.clientX, y: event.clientY };
      const others = clips.filter((other) => other.id !== clip.id);
      const targets = snapTargets(clip.id);
      const threshold = SNAP_PIXELS / zoom;
      let moved = false;

      const onMove = (move: PointerEvent) => {
        if (!moved) {
          if (Math.hypot(move.clientX - origin.x, move.clientY - origin.y) < 3)
            return;
          moved = true;
          history.pause();
        }
        const delta = (move.clientX - origin.x) / zoom;
        const snapOn = snapping && !move.altKey;

        if (mode === "move") {
          const row = rowAt(move.clientY);
          const target =
            row && !row.track.locked && trackAccepts(row.track, clip.type)
              ? row.track
              : track;
          let desired = clip.start + delta;
          const snap = snapOn
            ? findSnap([desired, desired + clip.duration], targets, threshold)
            : null;
          if (snap) desired += snap.delta;
          const start = nearestFreeStart(
            others.filter((other) => other.trackId === target.id),
            snapToFrame(desired),
            clip.duration
          );
          setSnapGuide(
            snap && Math.abs(start - snapToFrame(desired)) < 1e-6
              ? snap.target
              : null
          );
          updateClip(clip.id, { start, trackId: target.id });
          return;
        }

        const bounds = neighborBounds(
          others.filter((other) => other.trackId === clip.trackId),
          clip
        );

        if (mode === "trim-start") {
          const earliest = Math.max(
            bounds.before,
            clip.type === "text" ? 0 : clip.start - clip.offset
          );
          let desired = clip.start + delta;
          const snap = snapOn ? findSnap([desired], targets, threshold) : null;
          if (snap) desired += snap.delta;
          const start = Math.min(
            clipEnd(clip) - MIN_CLIP_DURATION,
            Math.max(earliest, snapToFrame(desired))
          );
          setSnapGuide(
            snap && Math.abs(start - desired) < 1e-6 ? snap.target : null
          );
          const shift = start - clip.start;
          updateClip(clip.id, {
            start,
            duration: clip.duration - shift,
            offset: clip.type === "text" ? 0 : clip.offset + shift,
          });
          return;
        }

        const latest = Math.min(
          bounds.after,
          clip.start + maxClipDuration(clip)
        );
        let desired = clipEnd(clip) + delta;
        const snap = snapOn ? findSnap([desired], targets, threshold) : null;
        if (snap) desired += snap.delta;
        const end = Math.max(
          clip.start + MIN_CLIP_DURATION,
          Math.min(latest, snapToFrame(desired))
        );
        setSnapGuide(
          snap && Math.abs(end - desired) < 1e-6 ? snap.target : null
        );
        updateClip(clip.id, { duration: end - clip.start });
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setSnapGuide(null);
        if (moved) history.resume();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [
      selection,
      setSelection,
      tracks,
      clips,
      snapTargets,
      zoom,
      history,
      snapping,
      rowAt,
      updateClip,
    ]
  );

  const onClipDoubleClick = useCallback(
    (clip: Clip) => {
      setSidePanelTab("inspector");
      if (clip.type === "text") {
        requestAnimationFrame(() =>
          document.getElementById("text-clip-content")?.focus()
        );
      }
    },
    [setSidePanelTab]
  );

  // Dropping from the library: preview where the clip will land as it's
  // dragged over a track, then add it there.
  useEffect(() => {
    if (!draggedItem) setDropPreview(null);
  }, [draggedItem]);

  const onLaneDragOver = (event: DragEvent, track: Track | "new") => {
    if (!draggedItem) return;
    const type = libraryItemType(draggedItem);
    if (track !== "new" && (track.locked || !trackAccepts(track, type))) {
      setDropPreview(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const length = libraryItemDuration(draggedItem);
    let desired = Math.max(0, timeAt(event.clientX));
    const snap = snapping
      ? findSnap([desired, desired + length], snapTargets(), SNAP_PIXELS / zoom)
      : null;
    if (snap) desired += snap.delta;
    const start =
      track === "new"
        ? snapToFrame(desired)
        : nearestFreeStart(
            clips.filter((clip) => clip.trackId === track.id),
            snapToFrame(desired),
            length
          );
    setDropPreview((current) =>
      current &&
      current.trackId === (track === "new" ? "new" : track.id) &&
      current.start === start
        ? current
        : {
            trackId: track === "new" ? "new" : track.id,
            start,
            duration: length,
            type,
          }
    );
  };

  const onLaneDrop = (event: DragEvent) => {
    const item = parseLibraryItem(event) ?? draggedItem;
    const preview = dropPreview;
    setDropPreview(null);
    ui.setDraggedItem(null);
    if (!item || !preview) return;
    event.preventDefault();
    const clipId = addLibraryItem(
      item,
      preview.trackId === "new"
        ? { newTrack: true, start: preview.start }
        : { trackId: preview.trackId, start: preview.start }
    );
    setSelection([clipId]);
  };

  return (
    <>
      <TimelineToolbar
        zoom={zoom}
        onZoom={(next) => zoomTo(next)}
        onFit={() => {
          setZoom(fitZoom());
          if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
        }}
      />

      <div
        ref={scrollerRef}
        className="scroll-quiet relative min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <div
          ref={contentRef}
          className="relative flex min-h-full flex-col"
          style={{ width: contentWidth }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top - RULER_HEIGHT;
            updateMyPresence({
              cursor:
                x > HEADER_WIDTH && y > 0
                  ? { time: (x - HEADER_WIDTH) / zoom, y: Math.round(y) }
                  : null,
            });
          }}
          onPointerLeave={() => updateMyPresence({ cursor: null })}
          onDragLeave={(event) => {
            const related = event.relatedTarget;
            if (
              !(related instanceof Node) ||
              !event.currentTarget.contains(related)
            ) {
              setDropPreview(null);
            }
          }}
        >
          {/* Ruler */}
          <div
            className="sticky top-0 z-30 flex"
            style={{ height: RULER_HEIGHT }}
          >
            <div
              className="sticky left-0 z-10 flex shrink-0 items-center justify-between border-r border-b border-neutral-950/6 bg-white pr-1.5 pl-3"
              style={{ width: HEADER_WIDTH }}
            >
              <span className="text-[11px] font-medium text-neutral-400">
                Tracks
              </span>
              <AddTrackMenu />
            </div>
            <div
              className="relative flex-1 cursor-text border-b border-neutral-950/6 bg-white"
              onPointerDown={beginScrub}
            >
              <RulerTicks pixelsPerSecond={zoom} seconds={seconds} />
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-neutral-950/[0.03]"
                style={{ width: duration * zoom }}
              />
              <ClientSideSuspense fallback={null}>
                <CommentMarkers pixelsPerSecond={zoom} />
              </ClientSideSuspense>
            </div>
          </div>

          {/* Tracks */}
          {rows.map((row) => (
            <div
              key={row.track.id}
              className="flex"
              style={{ height: row.height }}
            >
              <TrackHeader track={row.track} />
              <div
                data-track-id={row.track.id}
                className={cn(
                  "relative flex-1 border-b border-neutral-950/5",
                  row.track.locked &&
                    "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(0_0_0/0.025)_6px_12px)]"
                )}
                onPointerDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  setSelection([]);
                  beginScrub(event);
                }}
                onDragOver={(event) => onLaneDragOver(event, row.track)}
                onDrop={onLaneDrop}
              >
                {clips
                  .filter((clip) => clip.trackId === row.track.id)
                  .map((clip) => (
                    <TimelineClip
                      key={clip.id}
                      clip={clip}
                      pixelsPerSecond={zoom}
                      rowHeight={row.height}
                      selected={selection.includes(clip.id)}
                      remote={remoteSelections.get(clip.id)}
                      locked={row.track.locked}
                      dimmed={row.track.hidden || row.track.muted}
                      onPointerDown={onClipPointerDown}
                      onDoubleClick={onClipDoubleClick}
                    />
                  ))}
                {dropPreview && dropPreview.trackId === row.track.id ? (
                  <DropGhost
                    preview={dropPreview}
                    zoom={zoom}
                    height={row.height}
                  />
                ) : null}
              </div>
            </div>
          ))}

          {draggedItem ? (
            <div className="flex" style={{ height: NEW_TRACK_HEIGHT }}>
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-neutral-950/6 bg-white"
                style={{ width: HEADER_WIDTH }}
              />
              <div
                className="relative flex flex-1 items-center border-b border-dashed border-neutral-950/10 pl-3 text-xs text-neutral-400"
                onDragOver={(event) => onLaneDragOver(event, "new")}
                onDrop={onLaneDrop}
              >
                <span className="sticky left-[calc(168px+12px)]">
                  Drop here to add a new track
                </span>
                {dropPreview?.trackId === "new" ? (
                  <DropGhost
                    preview={dropPreview}
                    zoom={zoom}
                    height={NEW_TRACK_HEIGHT}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex min-h-6 flex-1">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-neutral-950/6 bg-white"
              style={{ width: HEADER_WIDTH }}
            />
            <div
              className="flex-1"
              onPointerDown={(event) => {
                setSelection([]);
                beginScrub(event);
              }}
            />
          </div>

          {snapGuide !== null ? (
            <div
              className="pointer-events-none absolute bottom-0 z-20 w-px bg-amber-400"
              style={{
                top: RULER_HEIGHT,
                left: HEADER_WIDTH + snapGuide * zoom,
              }}
            />
          ) : null}

          <OtherPlayheads pixelsPerSecond={zoom} />
          <Playhead pixelsPerSecond={zoom} />
          <OtherCursors pixelsPerSecond={zoom} />
        </div>
      </div>
    </>
  );
}

function DropGhost({
  preview,
  zoom,
  height,
}: {
  preview: DropPreview;
  zoom: number;
  height: number;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-md border-2 border-dashed",
        preview.type === "video" && "border-neutral-700 bg-neutral-900/15",
        preview.type === "text" && "border-title-clip bg-title-clip/15",
        preview.type === "audio" && "border-sound-clip bg-sound-clip/15"
      )}
      style={{
        left: preview.start * zoom,
        width: preview.duration * zoom,
        top: CLIP_INSET,
        height: height - CLIP_INSET * 2,
      }}
    />
  );
}

function TrackHeader({ track }: { track: Track }) {
  const { updateTrack, deleteTrack } = useEditorActions();
  const visual = track.kind === "visual";

  return (
    <div
      className="group/track sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-b border-neutral-950/6 bg-white pr-1.5 pl-3"
      style={{ width: HEADER_WIDTH }}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          visual
            ? "bg-neutral-100 text-neutral-500"
            : "bg-sound-clip/15 text-[oklch(0.45_0.1_165)]"
        )}
      >
        {visual ? (
          <FilmIcon className="size-3.5" />
        ) : (
          <AudioLinesIcon className="size-3.5" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-700">
        {track.name}
      </span>
      <div className="flex items-center">
        {visual ? (
          <TrackToggle
            label={track.hidden ? "Show track" : "Hide track"}
            active={track.hidden}
            onClick={() => updateTrack(track.id, { hidden: !track.hidden })}
          >
            {track.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </TrackToggle>
        ) : (
          <TrackToggle
            label={track.muted ? "Unmute track" : "Mute track"}
            active={track.muted}
            onClick={() => updateTrack(track.id, { muted: !track.muted })}
          >
            {track.muted ? <VolumeXIcon /> : <Volume2Icon />}
          </TrackToggle>
        )}
        <TrackToggle
          label={track.locked ? "Unlock track" : "Lock track"}
          active={track.locked}
          onClick={() => updateTrack(track.id, { locked: !track.locked })}
        >
          {track.locked ? <LockIcon /> : <UnlockIcon />}
        </TrackToggle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${track.name} options`}
              className="flex size-6 cursor-pointer items-center justify-center rounded-md text-neutral-400 opacity-0 transition hover:bg-neutral-950/5 hover:text-neutral-700 group-hover/track:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontalIcon className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              variant="destructive"
              className="text-[13px]"
              onSelect={() => deleteTrack(track.id)}
            >
              <Trash2Icon />
              Delete track
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function TrackToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <TooltipButton
      label={label}
      size="icon-xs"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "text-neutral-400 opacity-0 group-hover/track:opacity-100 focus-visible:opacity-100 [&_svg]:size-3.5",
        active && "text-neutral-900 opacity-100 aria-pressed:bg-transparent"
      )}
    >
      {children}
    </TooltipButton>
  );
}

function AddTrackMenu() {
  const { addTrack } = useEditorActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add track"
          className="flex size-5 cursor-pointer items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-950/5 hover:text-neutral-700 data-[state=open]:bg-neutral-950/5"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          className="text-[13px]"
          onSelect={() => addTrack("visual")}
        >
          <FilmIcon />
          Visual track
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[13px]"
          onSelect={() => addTrack("audio")}
        >
          <AudioLinesIcon />
          Audio track
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TimelineToolbar({
  zoom,
  onZoom,
  onFit,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
  onFit: () => void;
}) {
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const playback = usePlayback();
  const [selection, setSelection] = useSelection();
  const { splitClips, duplicateClips, deleteClips } = useEditorActions();
  const { snapping, setSnapping } = useEditorUi();
  const hasSelection = selection.length > 0;

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-neutral-950/6 px-2">
      <TooltipButton
        label="Undo"
        shortcut={["⌘", "Z"]}
        disabled={!canUndo}
        onClick={undo}
      >
        <Undo2Icon />
      </TooltipButton>
      <TooltipButton
        label="Redo"
        shortcut={["⌘", "⇧", "Z"]}
        disabled={!canRedo}
        onClick={redo}
      >
        <Redo2Icon />
      </TooltipButton>
      <div className="mx-1 h-4 w-px bg-neutral-950/10" />
      <TooltipButton
        label={
          hasSelection ? "Split selection at playhead" : "Split at playhead"
        }
        shortcut={["S"]}
        onClick={() => splitClips(selection, playback.time)}
      >
        <ScissorsIcon />
      </TooltipButton>
      <TooltipButton
        label="Duplicate"
        shortcut={["⌘", "D"]}
        disabled={!hasSelection}
        onClick={() => setSelection(duplicateClips(selection))}
      >
        <CopyIcon />
      </TooltipButton>
      <TooltipButton
        label="Delete"
        shortcut={["⌫"]}
        disabled={!hasSelection}
        onClick={() => {
          deleteClips(selection);
          setSelection([]);
        }}
      >
        <Trash2Icon />
      </TooltipButton>

      <div className="ml-auto flex items-center gap-1">
        <TooltipButton
          label={snapping ? "Snapping on" : "Snapping off"}
          shortcut={["Hold", "⌥"]}
          aria-pressed={snapping}
          className="aria-pressed:text-brand"
          onClick={() => setSnapping(!snapping)}
        >
          <MagnetIcon />
        </TooltipButton>
        <div className="mx-1 h-4 w-px bg-neutral-950/10" />
        <TooltipButton
          label="Zoom out"
          shortcut={["−"]}
          onClick={() => onZoom(zoom / 1.4)}
        >
          <ZoomOutIcon />
        </TooltipButton>
        <Slider
          aria-label="Zoom"
          className="hidden w-24 sm:flex"
          min={0}
          max={1}
          step={0.001}
          value={[zoomToSlider(zoom)]}
          onValueChange={([value]) => onZoom(sliderToZoom(value))}
        />
        <TooltipButton
          label="Zoom in"
          shortcut={["+"]}
          onClick={() => onZoom(zoom * 1.4)}
        >
          <ZoomInIcon />
        </TooltipButton>
        <TooltipButton label="Zoom to fit" onClick={onFit}>
          <ShrinkIcon />
        </TooltipButton>
      </div>
    </div>
  );
}
