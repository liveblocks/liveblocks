"use client";

import { LockIcon, TypeIcon } from "lucide-react";
import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { FilmstripFrame } from "@/components/filmstrip-frame";
import { Waveform } from "@/components/waveform";
import { CLIP_INSET, type ClipDragMode } from "@/components/timeline/constants";
import {
  FRAME_ASPECT,
  frameIndexAt,
  getAsset,
  type VideoAsset,
} from "@/lib/media";
import { lookFilter, type Clip } from "@/lib/project";
import { formatDuration } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export type RemoteSelection = { name: string; color: string; avatar: string };

export type ClipPointerDown = (
  event: ReactPointerEvent,
  clip: Clip,
  mode: ClipDragMode
) => void;

export const TimelineClip = memo(function TimelineClip({
  clip,
  pixelsPerSecond,
  rowHeight,
  selected,
  remote,
  locked,
  dimmed,
  onPointerDown,
  onDoubleClick,
}: {
  clip: Clip;
  pixelsPerSecond: number;
  rowHeight: number;
  selected: boolean;
  remote?: RemoteSelection[];
  locked: boolean;
  dimmed: boolean;
  onPointerDown: ClipPointerDown;
  onDoubleClick: (clip: Clip) => void;
}) {
  const asset = getAsset(clip.assetId);
  const left = clip.start * pixelsPerSecond;
  const width = Math.max(4, clip.duration * pixelsPerSecond);
  const height = rowHeight - CLIP_INSET * 2;
  // Narrow clips keep their middle half free to grab for moving.
  const handleWidth = Math.min(8, width / 4);
  const ring = selected ? "var(--color-brand)" : remote?.[0]?.color;
  const name =
    clip.type === "text"
      ? clip.text.split("\n")[0] || "Text"
      : (asset?.name ?? "Clip");

  return (
    <div
      data-clip-id={clip.id}
      role="button"
      tabIndex={-1}
      aria-label={`${name}, ${formatDuration(clip.duration)}`}
      aria-pressed={selected}
      className={cn(
        "group/clip absolute overflow-hidden rounded-md select-none",
        locked
          ? "cursor-not-allowed"
          : "cursor-grab touch-none active:cursor-grabbing",
        dimmed && "opacity-40",
        clip.type === "text" && "bg-title-clip",
        clip.type === "audio" && "bg-sound-clip",
        clip.type === "video" && "bg-neutral-800"
      )}
      style={{ left, width, top: CLIP_INSET, height }}
      onPointerDown={(event) => onPointerDown(event, clip, "move")}
      onDoubleClick={() => onDoubleClick(clip)}
    >
      {clip.type === "video" && asset?.kind === "video" ? (
        <Filmstrip
          asset={asset}
          clip={clip}
          width={width}
          height={height}
          pixelsPerSecond={pixelsPerSecond}
        />
      ) : null}

      {clip.type === "audio" && asset?.kind === "audio" ? (
        <Waveform
          peaks={asset.peaks}
          from={clip.offset}
          to={clip.offset + clip.duration}
          className="absolute inset-x-0 bottom-1 h-[62%] w-full text-white/55"
        />
      ) : null}

      {clip.type === "text" ? (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.14),transparent)]" />
      ) : null}

      <Fades
        clip={clip}
        pixelsPerSecond={pixelsPerSecond}
        width={width}
        height={height}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1 px-1.5 pt-1 text-[11px] leading-4 font-medium text-white",
          clip.type === "video" &&
            "bg-gradient-to-b from-black/55 to-transparent pb-2 [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]"
        )}
      >
        {clip.type === "text" ? <TypeIcon className="size-3 shrink-0" /> : null}
        {locked ? <LockIcon className="size-3 shrink-0" /> : null}
        <span className="truncate">{name}</span>
        {width > 110 ? (
          <span className="shrink-0 text-white/65 tabular">
            {formatDuration(clip.duration)}
          </span>
        ) : null}
      </div>

      {ring ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{ boxShadow: `inset 0 0 0 2px ${ring}` }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" />
      )}

      {remote && remote.length > 0 ? (
        <div className="pointer-events-none absolute right-1 bottom-1 flex -space-x-1">
          {remote.slice(0, 3).map((user) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={user.name}
              src={user.avatar}
              alt={user.name}
              className="size-4 rounded-full"
              style={{ boxShadow: `0 0 0 1.5px ${user.color}` }}
              draggable={false}
            />
          ))}
        </div>
      ) : null}

      {!locked ? (
        <>
          <TrimHandle
            side="start"
            width={handleWidth}
            selected={selected}
            clip={clip}
            onPointerDown={onPointerDown}
          />
          <TrimHandle
            side="end"
            width={handleWidth}
            selected={selected}
            clip={clip}
            onPointerDown={onPointerDown}
          />
        </>
      ) : null}
    </div>
  );
});

function TrimHandle({
  side,
  width,
  selected,
  clip,
  onPointerDown,
}: {
  side: "start" | "end";
  width: number;
  selected: boolean;
  clip: Clip;
  onPointerDown: ClipPointerDown;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-y-0 z-10 flex cursor-ew-resize items-center justify-center opacity-0 transition-opacity group-hover/clip:opacity-100",
        side === "start" ? "left-0 rounded-l-md" : "right-0 rounded-r-md",
        selected ? "bg-brand opacity-100" : "bg-white/85"
      )}
      style={{ width }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(
          event,
          clip,
          side === "start" ? "trim-start" : "trim-end"
        );
      }}
    >
      <span
        className={cn(
          "h-3 w-0.5 rounded-full",
          selected ? "bg-white/90" : "bg-neutral-900/40"
        )}
      />
    </div>
  );
}

/**
 * Thumbnails along a video clip, each showing the frame at its position, so
 * trimming the in point shifts the strip like in a real editor.
 */
function Filmstrip({
  asset,
  clip,
  width,
  height,
  pixelsPerSecond,
}: {
  asset: VideoAsset;
  clip: Clip;
  width: number;
  height: number;
  pixelsPerSecond: number;
}) {
  const tileWidth = height * FRAME_ASPECT;
  const count = Math.max(1, Math.ceil(width / tileWidth));
  const filter = lookFilter(clip.look);

  return (
    <div className="absolute inset-0">
      {Array.from({ length: count }, (_, index) => {
        const time =
          clip.offset + (index * tileWidth + tileWidth / 2) / pixelsPerSecond;
        return (
          <FilmstripFrame
            key={index}
            asset={asset}
            index={frameIndexAt(asset, time)}
            className="absolute inset-y-0"
            style={{ left: index * tileWidth, width: tileWidth, filter }}
          />
        );
      })}
    </div>
  );
}

/** Fade ramps, drawn as shaded corners like in Final Cut. */
function Fades({
  clip,
  pixelsPerSecond,
  width,
  height,
}: {
  clip: Clip;
  pixelsPerSecond: number;
  width: number;
  height: number;
}) {
  const fadeIn = Math.min(width, clip.fadeIn * pixelsPerSecond);
  const fadeOut = Math.min(width, clip.fadeOut * pixelsPerSecond);
  if (fadeIn <= 0 && fadeOut <= 0) return null;

  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    >
      {fadeIn > 0 ? (
        <>
          <polygon
            points={`0,0 ${fadeIn},0 0,${height}`}
            fill="rgb(0 0 0 / 0.32)"
          />
          <line
            x1={0}
            y1={height}
            x2={fadeIn}
            y2={0}
            stroke="rgb(255 255 255 / 0.85)"
            strokeWidth={1.25}
          />
        </>
      ) : null}
      {fadeOut > 0 ? (
        <>
          <polygon
            points={`${width},0 ${width - fadeOut},0 ${width},${height}`}
            fill="rgb(0 0 0 / 0.32)"
          />
          <line
            x1={width}
            y1={height}
            x2={width - fadeOut}
            y2={0}
            stroke="rgb(255 255 255 / 0.85)"
            strokeWidth={1.25}
          />
        </>
      ) : null}
    </svg>
  );
}
