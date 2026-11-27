"use client";

import {
  ChevronDownIcon,
  MaximizeIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  SkipBackIcon,
  SkipForwardIcon,
  StepBackIcon,
  StepForwardIcon,
} from "lucide-react";
import { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Kbd } from "@/components/ui/kbd";
import { Stage } from "@/components/viewer/stage";
import { useEditorActions, useProject } from "@/hooks/use-editor";
import {
  usePlayback,
  usePlaybackDuration,
  usePlaybackLoop,
  usePlaybackPlaying,
  usePlaybackTime,
} from "@/hooks/use-playback";
import { ASPECTS, aspectRatio, FPS, type AspectId } from "@/lib/project";
import { formatTimecode } from "@/lib/timeline";

export function Viewer() {
  const project = useProject();
  const frameRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col">
      <div
        ref={frameRef}
        className="stage-backdrop relative min-h-0 flex-1 [container-type:size]"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Stage ratio={aspectRatio(project.aspect)} />
        </div>
      </div>
      <Transport
        onFullscreen={() => {
          void frameRef.current?.requestFullscreen?.();
        }}
      />
    </div>
  );
}

function Transport({ onFullscreen }: { onFullscreen: () => void }) {
  const playback = usePlayback();
  const playing = usePlaybackPlaying();
  const loop = usePlaybackLoop();
  const duration = usePlaybackDuration();

  return (
    <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-neutral-950/6 px-3">
      <div className="flex min-w-0 items-baseline gap-1.5 text-[13px] tabular">
        <CurrentTimecode />
        <span className="hidden text-neutral-400 sm:inline">
          / {formatTimecode(duration)}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <TooltipButton
          label="Go to start"
          shortcut={["Home"]}
          className="hidden sm:inline-flex"
          onClick={() => playback.seek(0, { reveal: true })}
        >
          <SkipBackIcon />
        </TooltipButton>
        <TooltipButton
          label="Previous frame"
          shortcut={["←"]}
          onClick={() => {
            playback.pause();
            playback.seek(playback.time - 1 / FPS);
          }}
        >
          <StepBackIcon />
        </TooltipButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => playback.toggle()}
              className="mx-1 flex size-9 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition hover:bg-neutral-800 focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-95"
            >
              {playing ? (
                <PauseIcon className="size-4 fill-current" />
              ) : (
                <PlayIcon className="ml-0.5 size-4 fill-current" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {playing ? "Pause" : "Play"}
            <Kbd>Space</Kbd>
          </TooltipContent>
        </Tooltip>
        <TooltipButton
          label="Next frame"
          shortcut={["→"]}
          onClick={() => {
            playback.pause();
            playback.seek(playback.time + 1 / FPS);
          }}
        >
          <StepForwardIcon />
        </TooltipButton>
        <TooltipButton
          label="Go to end"
          shortcut={["End"]}
          className="hidden sm:inline-flex"
          onClick={() => playback.seek(playback.duration, { reveal: true })}
        >
          <SkipForwardIcon />
        </TooltipButton>
      </div>

      <div className="flex items-center justify-end gap-0.5">
        <TooltipButton
          label={loop ? "Loop on" : "Loop off"}
          aria-pressed={loop}
          onClick={() => playback.setLoop(!loop)}
          className="aria-pressed:text-brand"
        >
          <RepeatIcon />
        </TooltipButton>
        <AspectMenu />
        <TooltipButton
          label="Fullscreen"
          className="hidden sm:inline-flex"
          onClick={onFullscreen}
        >
          <MaximizeIcon />
        </TooltipButton>
      </div>
    </div>
  );
}

function CurrentTimecode() {
  const time = usePlaybackTime();
  return (
    <span className="font-medium text-neutral-900">{formatTimecode(time)}</span>
  );
}

function AspectMenu() {
  const project = useProject();
  const { updateProject } = useEditorActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Aspect ratio"
          className="flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-neutral-600 tabular outline-none hover:bg-neutral-950/5 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-neutral-950/5"
        >
          {project.aspect}
          <ChevronDownIcon className="size-3 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-neutral-500">
          Aspect ratio
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={project.aspect}
          onValueChange={(aspect) => {
            const match = ASPECTS.find((item) => item.id === aspect);
            if (match) updateProject({ aspect: match.id satisfies AspectId });
          }}
        >
          {ASPECTS.map((aspect) => (
            <DropdownMenuRadioItem
              key={aspect.id}
              value={aspect.id}
              className="text-[13px]"
            >
              {aspect.label}
              <span className="ml-auto text-xs text-neutral-400 tabular">
                {aspect.id}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
