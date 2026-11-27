"use client";

import { useOthers, useThreads } from "@liveblocks/react/suspense";
import { BookmarkIcon, MessageCircleIcon } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { peakBetween } from "@/lib/audio-engine";
import { formatTime } from "@/lib/format";
import { cutPoints, toEdited, toOriginal, type Timeline } from "@/lib/timeline";
import { getSpeaker, PARAGRAPHS, spanEnd, spanStart } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import {
  useEditedPosition,
  useEditor,
  usePlayerState,
  type WordRange,
} from "./editor-context";
import { useChapters } from "@/hooks/use-chapters";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const WAVEFORM_HEIGHT = 56;
const PLAYED_COLOR = "#6d4aea";
const UNPLAYED_COLOR = "#d4d4d8";

/**
 * The edited episode laid out in time. Cut audio is gone from the waveform
 * (rose ticks mark the cut points), and chapters, speakers, comments, and
 * everyone's playhead and selection sit on top of it. Click or drag to seek.
 */
export function EpisodeTimeline() {
  const {
    engine,
    timeline,
    cuts,
    selection,
    setActiveThreadId,
    setPanel,
    setPanelOpen,
    seekToWord,
  } = useEditor();
  const { status } = usePlayerState();
  const others = useOthers();
  const { threads } = useThreads();

  const trackRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const playedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const dragging = useRef(false);

  const duration = Math.max(timeline.duration, 0.001);
  const percent = (edited: number) =>
    `${Math.min(100, Math.max(0, (edited / duration) * 100))}%`;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  // Kept up to date outside of React, so playback doesn't re-render this.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const update = () => {
      const position = engine.getEditedPosition();
      track.setAttribute("aria-valuenow", String(Math.round(position)));
      track.setAttribute("aria-valuetext", formatTime(position));
    };
    update();
    return engine.subscribe(update);
  }, [engine]);

  // Draw the waveform twice: gray, and in color for the part already played
  // (revealed by the playhead with a clip-path, so playback doesn't redraw).
  useEffect(() => {
    const peaks = engine.peaks;
    for (const [canvas, color] of [
      [baseCanvasRef.current, UNPLAYED_COLOR],
      [playedCanvasRef.current, PLAYED_COLOR],
    ] as const) {
      if (canvas && width > 0) {
        drawWaveform(canvas, width, timeline, peaks, color);
      }
    }
  }, [engine, width, timeline, status]);

  const chapterMarkers = useChapters().flatMap((chapter) =>
    chapter.time === null ? [] : [{ ...chapter, time: chapter.time }]
  );

  const speakerBlocks = useMemo(
    () =>
      PARAGRAPHS.flatMap((paragraph) => {
        const kept = paragraph.words.filter((word) => !cuts.has(word.index));
        if (kept.length === 0) {
          return [];
        }
        return [
          {
            id: paragraph.id,
            color: getSpeaker(paragraph.speakerId).color,
            start: toEdited(timeline, kept[0].start),
            end: toEdited(timeline, kept[kept.length - 1].end),
          },
        ];
      }),
    [timeline, cuts]
  );

  const cutMarkers = useMemo(() => cutPoints(timeline), [timeline]);

  const openThreads = threads.filter((thread) => !thread.resolved);

  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return 0;
    }
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * timeline.duration;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.seekEdited(timeAt(event.clientX));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverX(event.clientX - rect.left);
    }
    if (dragging.current) {
      engine.seekEdited(timeAt(event.clientX));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const rangeToEdited = (range: WordRange) => ({
    start: toEdited(timeline, spanStart(range.start)),
    end: toEdited(timeline, spanEnd(range.end)),
  });

  return (
    <div className="shrink-0 border-t border-neutral-950/5 px-4 pt-2 pb-3 sm:px-5">
      {/* Chapters */}
      <div className="relative h-5">
        {chapterMarkers.map((marker, index) => {
          const next = chapterMarkers[index + 1];
          const space =
            ((next ? next.time : duration) - marker.time) / duration;
          return (
            <button
              key={marker.id}
              type="button"
              onClick={() => engine.seekEdited(marker.time)}
              className="absolute top-0 flex h-5 cursor-pointer items-center gap-1 overflow-hidden rounded-sm pr-1 text-[11px] font-medium text-neutral-500 outline-none hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                left: percent(marker.time),
                maxWidth: `calc(${space * 100}% - 4px)`,
              }}
              title={marker.title}
            >
              <BookmarkIcon className="size-3 shrink-0 text-primary" />
              <span className="truncate">
                {marker.title || "Untitled chapter"}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={Math.round(timeline.duration)}
        className="relative cursor-pointer touch-none rounded-md outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHoverX(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            engine.skip(event.key === "ArrowLeft" ? -5 : 5);
          }
        }}
      >
        <div className="relative" style={{ height: WAVEFORM_HEIGHT }}>
          {/* Chapter boundaries */}
          {chapterMarkers.map((marker) => (
            <span
              key={marker.id}
              className="absolute inset-y-0 w-px bg-primary/25"
              style={{ left: percent(marker.time) }}
            />
          ))}

          {/* Selections: mine, then everyone else's in their color */}
          {selection ? (
            <RangeShade
              {...rangeToEdited(selection)}
              duration={duration}
              color="oklch(0.54 0.23 285)"
            />
          ) : null}
          {others.map((other) =>
            other.presence.selection ? (
              <RangeShade
                key={other.connectionId}
                {...rangeToEdited(other.presence.selection)}
                duration={duration}
                color={other.info.color}
              />
            ) : null
          )}

          <canvas
            ref={baseCanvasRef}
            className="pointer-events-none absolute inset-0"
          />
          <PlayedClip>
            <canvas
              ref={playedCanvasRef}
              className="pointer-events-none absolute inset-0"
            />
          </PlayedClip>

          {status === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
              Loading audio…
            </div>
          ) : status === "error" ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-rose-500">
              Couldn’t load the recording
            </div>
          ) : null}

          {/* Cut points */}
          {cutMarkers.map((time, index) => (
            <span
              key={`${time}-${index}`}
              className="pointer-events-none absolute inset-y-1 w-px bg-rose-400/70"
              style={{ left: percent(time) }}
            >
              <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-rose-400" />
            </span>
          ))}

          {/* Comments */}
          {openThreads.map((thread) => {
            const time = toEdited(
              timeline,
              spanStart(thread.metadata.startWord)
            );
            return (
              <button
                key={thread.id}
                type="button"
                title="Open comment"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  seekToWord(thread.metadata.startWord);
                  setActiveThreadId(thread.id);
                  setPanel("comments");
                  setPanelOpen(true);
                }}
                className="absolute top-0.5 z-10 flex size-4 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-amber-400 text-white shadow-sm ring-2 ring-white hover:bg-amber-500"
                style={{ left: percent(time) }}
              >
                <MessageCircleIcon className="size-2.5 fill-current" />
              </button>
            );
          })}

          {/* Everyone else's playhead */}
          {others.map((other) =>
            other.presence.playhead > 0 || other.presence.playing ? (
              <PlayheadLine
                key={other.connectionId}
                left={percent(toEdited(timeline, other.presence.playhead))}
                color={other.info.color}
                smooth={other.presence.playing}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={other.info.avatar}
                  alt={other.info.name}
                  title={`${other.info.name}${other.presence.playing ? " is listening" : ""}`}
                  className="size-4 rounded-full bg-white"
                  style={{ boxShadow: `0 0 0 2px ${other.info.color}` }}
                />
              </PlayheadLine>
            ) : null
          )}

          <MyPlayhead duration={duration} />

          {hoverX !== null && width > 0 ? (
            <span
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-neutral-900/30"
              style={{ left: hoverX }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-neutral-900 px-1 py-px text-[10px] font-medium text-white tabular-nums">
                {formatTime((hoverX / width) * timeline.duration)}
              </span>
            </span>
          ) : null}
        </div>

        {/* Who's speaking */}
        <div className="relative mt-1.5 h-1.5">
          {speakerBlocks.map((block) => (
            <span
              key={block.id}
              className="absolute inset-y-0 rounded-full opacity-80"
              style={{
                left: percent(block.start),
                width: `max(2px, calc(${percent(block.end - block.start)} - 2px))`,
                backgroundColor: block.color,
              }}
            />
          ))}
        </div>
      </div>

      <Ruler duration={timeline.duration} width={width} />
    </div>
  );
}

function MyPlayhead({ duration }: { duration: number }) {
  const position = useEditedPosition();
  return (
    <span
      className="pointer-events-none absolute -inset-y-1 z-20 w-0.5 -translate-x-1/2 rounded-full bg-neutral-900"
      style={{ left: `${Math.min(100, (position / duration) * 100)}%` }}
    >
      <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-neutral-900 ring-2 ring-white" />
    </span>
  );
}

function PlayedClip({ children }: { children: ReactNode }) {
  const { timeline } = useEditor();
  const position = useEditedPosition();
  const played = timeline.duration > 0 ? position / timeline.duration : 0;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ clipPath: `inset(0 ${Math.max(0, 100 - played * 100)}% 0 0)` }}
    >
      {children}
    </div>
  );
}

function PlayheadLine({
  left,
  color,
  smooth,
  children,
}: {
  left: string;
  color: string;
  smooth: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 rounded-full",
        // Presence arrives ~10 times a second; glide between updates.
        smooth && "transition-[left] duration-100 ease-linear"
      )}
      style={{ left, backgroundColor: color }}
    >
      <span className="pointer-events-auto absolute -bottom-2 left-1/2 -translate-x-1/2">
        {children}
      </span>
    </span>
  );
}

function RangeShade({
  start,
  end,
  duration,
  color,
}: {
  start: number;
  end: number;
  duration: number;
  color: string;
}) {
  if (end <= start) {
    return null;
  }
  return (
    <span
      className="pointer-events-none absolute inset-y-0 rounded-sm"
      style={{
        left: `${(start / duration) * 100}%`,
        width: `${((end - start) / duration) * 100}%`,
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    />
  );
}

function Ruler({ duration, width }: { duration: number; width: number }) {
  if (width === 0 || duration === 0) {
    return <div className="h-4" />;
  }
  const steps = [5, 10, 15, 30, 60, 120];
  const step =
    steps.find((candidate) => (candidate / duration) * width >= 56) ?? 300;
  const ticks: number[] = [];
  for (let time = 0; time <= duration - step / 3; time += step) {
    ticks.push(time);
  }
  return (
    <div className="relative mt-1 h-4 text-[10px] text-neutral-400 tabular-nums select-none">
      {ticks.map((time) => (
        <span
          key={time}
          className="absolute top-0 -translate-x-1/2 first:translate-x-0"
          style={{ left: `${(time / duration) * 100}%` }}
        >
          {formatTime(time)}
        </span>
      ))}
      <span className="absolute top-0 right-0">{formatTime(duration)}</span>
    </div>
  );
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  width: number,
  timeline: Timeline,
  peaks: Float32Array | null,
  color: string
) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(WAVEFORM_HEIGHT * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${WAVEFORM_HEIGHT}px`;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, WAVEFORM_HEIGHT);
  context.fillStyle = color;

  const step = BAR_WIDTH + BAR_GAP;
  const bars = Math.floor(width / step);
  const duration = timeline.duration;

  for (let bar = 0; bar < bars; bar++) {
    let peak = 0;
    if (peaks && duration > 0) {
      const from = (bar / bars) * duration;
      const to = ((bar + 1) / bars) * duration;
      const originalFrom = toOriginal(timeline, from);
      const originalTo = toOriginal(timeline, to);
      const length = to - from;
      // A bar can straddle a cut: sample both sides of it.
      peak =
        Math.abs(originalTo - originalFrom - length) < 1e-3
          ? peakBetween(peaks, originalFrom, originalTo)
          : Math.max(
              peakBetween(peaks, originalFrom, originalFrom + length / 2),
              peakBetween(peaks, originalTo - length / 2, originalTo)
            );
    }
    const height = Math.max(2, peak * (WAVEFORM_HEIGHT - 8));
    const y = (WAVEFORM_HEIGHT - height) / 2;
    context.beginPath();
    context.roundRect(bar * step, y, BAR_WIDTH, height, 1);
    context.fill();
  }
}
