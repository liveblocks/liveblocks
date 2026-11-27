"use client";

import {
  AudioLinesIcon,
  FilmIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TypeIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useEditorUi } from "@/components/editor-context";
import { FilmstripFrame } from "@/components/filmstrip-frame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Waveform } from "@/components/waveform";
import { useEditorActions, type LibraryItem } from "@/hooks/use-editor";
import { usePlayback } from "@/hooks/use-playback";
import {
  AUDIO_ASSETS,
  FRAME_COUNT,
  VIDEO_ASSETS,
  type AudioAsset,
  type VideoAsset,
} from "@/lib/media";
import { fontClassName, TEXT_STYLES } from "@/lib/project";
import { formatDuration } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { TextPreview } from "@/components/viewer/text-layer";

export const LIBRARY_DRAG_TYPE = "application/x-video-editor-item";

/** Media to drag onto the timeline, or add at the playhead with a click. */
export function MediaLibrary() {
  return (
    <Tabs defaultValue="video" className="h-full">
      <div className="flex shrink-0 flex-col gap-3 px-3 pt-3 pb-2">
        <h2 className="px-0.5 text-[13px] font-semibold text-neutral-900">
          Library
        </h2>
        <TabsList className="w-full">
          <TabsTrigger value="video">
            <FilmIcon />
            Video
          </TabsTrigger>
          <TabsTrigger value="audio">
            <AudioLinesIcon />
            Audio
          </TabsTrigger>
          <TabsTrigger value="text">
            <TypeIcon />
            Text
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="video"
        className="scroll-quiet overflow-y-auto px-3 pb-3"
      >
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {VIDEO_ASSETS.map((asset) => (
            <VideoItem key={asset.id} asset={asset} />
          ))}
        </div>
        <LibraryHint />
      </TabsContent>

      <TabsContent
        value="audio"
        className="scroll-quiet overflow-y-auto px-3 pb-3"
      >
        <div className="flex flex-col gap-1">
          {AUDIO_ASSETS.map((asset) => (
            <AudioItem key={asset.id} asset={asset} />
          ))}
        </div>
        <LibraryHint />
      </TabsContent>

      <TabsContent
        value="text"
        className="scroll-quiet overflow-y-auto px-3 pb-3"
      >
        <div className="flex flex-col gap-2">
          {TEXT_STYLES.map((style) => (
            <TextItem key={style.id} style={style} />
          ))}
        </div>
        <LibraryHint />
      </TabsContent>
    </Tabs>
  );
}

function LibraryHint() {
  return (
    <p className="mt-4 px-0.5 text-center text-xs leading-relaxed text-neutral-400">
      Drag onto the timeline, or click + to add at the playhead.
    </p>
  );
}

/** Drag and click handlers shared by every library item. */
function useLibraryItem(item: LibraryItem) {
  const { setDraggedItem } = useEditorUi();
  const { addLibraryItem, setSelection } = useEditorActions();
  const playback = usePlayback();

  return {
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(LIBRARY_DRAG_TYPE, JSON.stringify(item));
      setDraggedItem(item);
    },
    onDragEnd: () => setDraggedItem(null),
    add: () => {
      const clipId = addLibraryItem(item, { start: playback.time });
      setSelection([clipId]);
    },
  };
}

function AddButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex size-6 cursor-pointer items-center justify-center rounded-md bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-950/10 transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <PlusIcon className="size-3.5" />
    </button>
  );
}

function VideoItem({ asset }: { asset: VideoAsset }) {
  const { add, ...drag } = useLibraryItem({ kind: "asset", assetId: asset.id });
  // Hovering scrubs through the clip's thumbnails.
  const [frame, setFrame] = useState<number | null>(null);

  return (
    <div className="group flex flex-col gap-1.5" {...drag}>
      <div
        className="relative aspect-video cursor-grab overflow-hidden rounded-lg ring-1 ring-neutral-950/8 active:cursor-grabbing"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const progress = (event.clientX - rect.left) / rect.width;
          setFrame(
            Math.min(
              FRAME_COUNT - 1,
              Math.max(0, Math.floor(progress * FRAME_COUNT))
            )
          );
        }}
        onPointerLeave={() => setFrame(null)}
        onDoubleClick={add}
      >
        <FilmstripFrame
          asset={asset}
          index={frame ?? 2}
          className="absolute inset-0"
        />
        {frame !== null ? (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/30">
            <div
              className="h-full bg-white"
              style={{ width: `${((frame + 1) / FRAME_COUNT) * 100}%` }}
            />
          </div>
        ) : null}
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1 py-px text-[10px] font-medium text-white tabular backdrop-blur-sm">
          {formatDuration(asset.duration)}
        </span>
        <AddButton
          label={`Add ${asset.name}`}
          onClick={add}
          className="absolute top-1.5 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
        />
      </div>
      <p className="truncate px-0.5 text-xs font-medium text-neutral-700">
        {asset.name}
      </p>
    </div>
  );
}

function AudioItem({ asset }: { asset: AudioAsset }) {
  const { add, ...drag } = useLibraryItem({ kind: "asset", assetId: asset.id });
  const audio = useRef<HTMLAudioElement>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    if (previewing) {
      element.currentTime = 0;
      void element.play().catch(() => setPreviewing(false));
    } else {
      element.pause();
    }
  }, [previewing]);

  return (
    <div
      className="group flex cursor-grab items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-neutral-950/4 active:cursor-grabbing"
      {...drag}
    >
      <button
        type="button"
        aria-label={previewing ? `Stop ${asset.name}` : `Preview ${asset.name}`}
        onClick={() => setPreviewing((value) => !value)}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-sound-clip/15 text-[oklch(0.45_0.1_165)] transition-colors hover:bg-sound-clip/25 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {previewing ? (
          <PauseIcon className="size-3.5 fill-current" />
        ) : (
          <PlayIcon className="size-3.5 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs font-medium text-neutral-800">
            {asset.name}
          </p>
          <span className="text-[11px] text-neutral-400 tabular">
            {formatDuration(asset.duration)}
          </span>
        </div>
        <Waveform
          peaks={asset.peaks}
          className="mt-1 h-4 w-full text-neutral-300"
        />
        <p className="sr-only">{asset.description}</p>
      </div>
      <AddButton
        label={`Add ${asset.name}`}
        onClick={add}
        className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <audio
        ref={audio}
        src={asset.src}
        preload="none"
        onEnded={() => setPreviewing(false)}
      />
    </div>
  );
}

function TextItem({ style }: { style: (typeof TEXT_STYLES)[number] }) {
  const { add, ...drag } = useLibraryItem({
    kind: "text",
    textStyle: style.id,
  });

  return (
    <div className="group flex flex-col gap-1.5" {...drag}>
      <div
        className="relative aspect-[16/7] cursor-grab overflow-hidden rounded-lg bg-[radial-gradient(120%_120%_at_30%_20%,#3b3f5c_0%,#16171f_70%)] ring-1 ring-neutral-950/8 [container-type:size] active:cursor-grabbing"
        onDoubleClick={add}
      >
        <TextPreview
          textStyle={style.id}
          text={style.sample}
          fontClassName={fontClassName(style.font)}
          color="#FFFFFF"
        />
        <AddButton
          label={`Add ${style.label}`}
          onClick={add}
          className="absolute top-1.5 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
        />
      </div>
      <p className="px-0.5 text-xs font-medium text-neutral-700">
        {style.label}
      </p>
    </div>
  );
}
