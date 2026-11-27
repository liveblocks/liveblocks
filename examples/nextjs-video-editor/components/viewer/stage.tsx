"use client";

import { shallow } from "@liveblocks/client";
import { useHistory, useOthersMapped } from "@liveblocks/react/suspense";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { TextPreview, textAnchor } from "@/components/viewer/text-layer";
import {
  useClips,
  useEditorActions,
  useProject,
  useSelection,
  useTracks,
} from "@/hooks/use-editor";
import { useMediaSync } from "@/hooks/use-media-sync";
import { usePlaybackPlaying, usePlaybackTime } from "@/hooks/use-playback";
import { getAsset } from "@/lib/media";
import { fontClassName, lookFilter, type Clip } from "@/lib/project";
import { fadeEnvelope, isClipActive } from "@/lib/timeline";
import { cn } from "@/lib/utils";

type RemoteSelection = { name: string; color: string };
type Guides = { x: boolean; y: boolean };
type LayerPointerDown = (event: ReactPointerEvent, clip: Clip) => void;

const CENTER_SNAP = 0.015;

/**
 * The composited frame at the playhead: visual tracks from the bottom up
 * (so the top track is drawn last, over the others) and the audio tracks,
 * which render nothing but play in sync.
 */
export function Stage({ ratio }: { ratio: number }) {
  const project = useProject();
  const tracks = useTracks();
  const clips = useClips();
  const [selection, setSelection] = useSelection();
  const stageRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<Guides>({ x: false, y: false });
  const onLayerPointerDown = useLayerDrag(stageRef, setGuides);

  const others = useOthersMapped(
    (other) => ({
      selection: other.presence.selectedClipIds,
      name: other.info.name,
      color: other.info.color,
    }),
    shallow
  );
  const remoteSelections = useMemo(() => {
    const map = new Map<string, RemoteSelection[]>();
    for (const [, other] of others) {
      for (const clipId of other.selection) {
        map.set(clipId, [...(map.get(clipId) ?? []), other]);
      }
    }
    return map;
  }, [others]);

  const visualTracks = tracks
    .filter((track) => track.kind === "visual")
    .reverse();
  const audioTracks = tracks.filter((track) => track.kind === "audio");

  return (
    <div
      ref={stageRef}
      className="relative overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_12px_32px_-8px_rgb(0_0_0/0.35)] [container-type:size]"
      style={{
        aspectRatio: ratio,
        width: `min(calc(100cqw - 48px), calc((100cqh - 48px) * ${ratio}))`,
        background: project.background,
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setSelection([]);
      }}
    >
      {visualTracks.map((track) =>
        clips
          .filter((clip) => clip.trackId === track.id)
          .map((clip) =>
            clip.type === "video" ? (
              <VideoLayer
                key={clip.id}
                clip={clip}
                hidden={track.hidden}
                selected={selection.includes(clip.id)}
                remote={remoteSelections.get(clip.id)}
                onPointerDown={track.locked ? undefined : onLayerPointerDown}
              />
            ) : clip.type === "text" ? (
              <TextLayer
                key={clip.id}
                clip={clip}
                hidden={track.hidden}
                selected={selection.includes(clip.id)}
                remote={remoteSelections.get(clip.id)}
                onPointerDown={track.locked ? undefined : onLayerPointerDown}
              />
            ) : null
          )
      )}

      {audioTracks.map((track) =>
        clips
          .filter((clip) => clip.trackId === track.id && clip.type === "audio")
          .map((clip) => (
            <AudioLayer key={clip.id} clip={clip} muted={track.muted} />
          ))
      )}

      {guides.x ? (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand" />
      ) : null}
      {guides.y ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-brand" />
      ) : null}
    </div>
  );
}

/**
 * Dragging a layer in the preview moves it in the frame, snapping to the
 * center. The whole drag is one undo step, and everyone sees it move live.
 */
function useLayerDrag(
  stageRef: RefObject<HTMLDivElement | null>,
  setGuides: (guides: Guides) => void
): LayerPointerDown {
  const [selection, setSelection] = useSelection();
  const { updateClip } = useEditorActions();
  const history = useHistory();

  return useCallback<LayerPointerDown>(
    (event, clip) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      if (event.shiftKey) {
        setSelection(
          selection.includes(clip.id)
            ? selection.filter((id) => id !== clip.id)
            : [...selection, clip.id]
        );
        return;
      }
      setSelection([clip.id]);

      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const origin = { x: event.clientX, y: event.clientY };
      let moved = false;

      const onMove = (move: PointerEvent) => {
        const dx = (move.clientX - origin.x) / rect.width;
        const dy = (move.clientY - origin.y) / rect.height;
        if (!moved) {
          if (Math.hypot(move.clientX - origin.x, move.clientY - origin.y) < 3)
            return;
          moved = true;
          history.pause();
        }
        let x = clip.x + dx;
        let y = clip.y + dy;
        const snapX = Math.abs(x) < CENTER_SNAP;
        const snapY = Math.abs(y) < CENTER_SNAP;
        if (snapX) x = 0;
        if (snapY) y = 0;
        setGuides({ x: snapX, y: snapY });
        updateClip(clip.id, {
          x: Math.round(x * 1000) / 1000,
          y: Math.round(y * 1000) / 1000,
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGuides({ x: false, y: false });
        if (moved) history.resume();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [selection, setSelection, stageRef, setGuides, updateClip, history]
  );
}

/** The selection ring around a layer: yours in the accent color, others' in theirs. */
function SelectionRing({
  selected,
  remote,
  scale,
  inset,
}: {
  selected: boolean;
  remote?: RemoteSelection[];
  scale: number;
  inset?: boolean;
}) {
  const color = selected ? "var(--color-brand)" : remote?.[0]?.color;
  if (!color) return null;
  const width = 2 / scale;
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        inset: inset ? 0 : `${-6 / scale}px`,
        boxShadow: `inset 0 0 0 ${width}px ${color}`,
        borderRadius: inset ? 0 : 4 / scale,
      }}
    >
      {!selected && remote?.[0] ? (
        <span
          className="absolute left-0 rounded-sm px-1.5 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap text-white"
          style={{
            background: color,
            top: inset ? 0 : undefined,
            bottom: inset ? undefined : "100%",
            transform: `scale(${1 / scale})`,
            transformOrigin: inset ? "left top" : "left bottom",
            marginBottom: inset ? undefined : 2 / scale,
          }}
        >
          {remote[0].name}
        </span>
      ) : null}
    </div>
  );
}

function motionProgress(clip: Clip, time: number) {
  return Math.min(1, Math.max(0, (time - clip.start) / clip.duration));
}

const VideoLayer = memo(function VideoLayer({
  clip,
  hidden,
  selected,
  remote,
  onPointerDown,
}: {
  clip: Clip;
  hidden: boolean;
  selected: boolean;
  remote?: RemoteSelection[];
  onPointerDown?: LayerPointerDown;
}) {
  const time = usePlaybackTime();
  const playing = usePlaybackPlaying();
  const ref = useRef<HTMLVideoElement>(null);
  const asset = getAsset(clip.assetId);
  const active = !hidden && isClipActive(clip, time);
  const upcoming = time < clip.start && time > clip.start - 2;

  useMediaSync(ref, {
    active,
    playing,
    target: clip.offset + (time - clip.start),
    cue: upcoming ? clip.offset : null,
  });

  const progress = motionProgress(clip, time);
  const motion =
    clip.motion === "push-in"
      ? 1 + 0.12 * progress
      : clip.motion === "pull-out"
        ? 1.12 - 0.12 * progress
        : 1;
  const scale = clip.scale * motion;

  if (!asset || asset.kind !== "video") return null;

  return (
    <div
      className={cn("absolute inset-0", onPointerDown && "cursor-move")}
      style={{
        opacity: active ? clip.opacity * fadeEnvelope(clip, time) : 0,
        visibility: active ? "visible" : "hidden",
        transform: `translate(${clip.x * 100}%, ${clip.y * 100}%) scale(${scale})`,
      }}
      onPointerDown={
        onPointerDown ? (event) => onPointerDown(event, clip) : undefined
      }
    >
      <video
        ref={ref}
        src={asset.src}
        muted
        playsInline
        preload="auto"
        className="pointer-events-none size-full object-cover"
        style={{ filter: lookFilter(clip.look) }}
      />
      <SelectionRing selected={selected} remote={remote} scale={scale} inset />
    </div>
  );
});

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeOutBack(value: number) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(value - 1, 3) + c * Math.pow(value - 1, 2);
}

const TextLayer = memo(function TextLayer({
  clip,
  hidden,
  selected,
  remote,
  onPointerDown,
}: {
  clip: Clip;
  hidden: boolean;
  selected: boolean;
  remote?: RemoteSelection[];
  onPointerDown?: LayerPointerDown;
}) {
  const time = usePlaybackTime();
  if (hidden || !isClipActive(clip, time)) return null;

  const anchor = textAnchor(clip.textStyle);
  const intro = easeOutCubic(
    Math.min(1, (time - clip.start) / Math.max(0.6, clip.fadeIn))
  );
  const rise = clip.motion === "rise" ? (1 - intro) * 6 : 0;
  const pop =
    clip.motion === "pop"
      ? 0.75 + 0.25 * easeOutBack(Math.min(1, (time - clip.start) / 0.45))
      : 1;
  const scale = clip.scale * pop;

  return (
    <TextPreview
      textStyle={clip.textStyle}
      text={clip.text}
      fontClassName={fontClassName(clip.font)}
      color={clip.color}
      transform={`translate(${clip.x * 100}cqw, ${clip.y * 100}cqh) ${anchor.translate} translateY(${rise}cqmin) scale(${scale})`}
      className={cn(onPointerDown && "cursor-move")}
      style={{ opacity: clip.opacity * fadeEnvelope(clip, time) }}
      onPointerDown={
        onPointerDown ? (event) => onPointerDown(event, clip) : undefined
      }
    >
      <SelectionRing selected={selected} remote={remote} scale={scale} />
    </TextPreview>
  );
});

const AudioLayer = memo(function AudioLayer({
  clip,
  muted,
}: {
  clip: Clip;
  muted: boolean;
}) {
  const time = usePlaybackTime();
  const playing = usePlaybackPlaying();
  const ref = useRef<HTMLAudioElement>(null);
  const asset = getAsset(clip.assetId);
  const active = isClipActive(clip, time);
  const upcoming = time < clip.start && time > clip.start - 2;

  useMediaSync(ref, {
    active: active && playing,
    playing,
    target: clip.offset + (time - clip.start),
    cue: upcoming ? clip.offset : null,
  });

  const volume = muted ? 0 : clip.volume * fadeEnvelope(clip, time);
  useEffect(() => {
    if (ref.current) {
      ref.current.volume = Math.min(1, Math.max(0, volume));
    }
  }, [volume]);

  if (!asset || asset.kind !== "audio") return null;
  return <audio ref={ref} src={asset.src} preload="auto" />;
});
