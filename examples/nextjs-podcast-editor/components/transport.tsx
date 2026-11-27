"use client";

import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SparklesIcon,
} from "lucide-react";
import { formatTime, formatTimecode } from "@/lib/format";
import { FILLER_WORDS } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import { useEditedPosition, useEditor, usePlayerState } from "./editor-context";
import { Button } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";

/** Play/pause, skip, the running clock, and view toggles. */
export function Transport() {
  const { engine, cuts, showCuts, setShowCuts, cutFillers, setPreviewFillers } =
    useEditor();
  const { status, playing } = usePlayerState();
  const remainingFillers = FILLER_WORDS.filter(
    (word) => !cuts.has(word.index)
  ).length;

  return (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-neutral-950/5 px-4 py-2 sm:px-5">
      <Clock />

      <div className="flex items-center gap-1.5">
        <WithTooltip label="Back 5 seconds">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => engine.skip(-5)}
            disabled={status !== "ready"}
            aria-label="Back 5 seconds"
          >
            <RotateCcwIcon />
          </Button>
        </WithTooltip>
        <WithTooltip label={playing ? "Pause" : "Play"} shortcut="Space">
          <Button
            variant="dark"
            size="icon"
            className="rounded-full"
            onClick={() => engine.toggle()}
            disabled={status !== "ready"}
            aria-label={playing ? "Pause" : "Play"}
          >
            {status === "loading" ? (
              <Loader2Icon className="animate-spin" />
            ) : playing ? (
              <PauseIcon className="fill-current" />
            ) : (
              <PlayIcon className="translate-x-px fill-current" />
            )}
          </Button>
        </WithTooltip>
        <WithTooltip label="Forward 5 seconds">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => engine.skip(5)}
            disabled={status !== "ready"}
            aria-label="Forward 5 seconds"
          >
            <RotateCwIcon />
          </Button>
        </WithTooltip>
      </div>

      <div className="flex items-center justify-end gap-1">
        {/* The sidebar holds this on wide screens. */}
        <WithTooltip
          label={
            remainingFillers > 0
              ? `Remove ${remainingFillers} filler words`
              : "No filler words left"
          }
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-neutral-500 xl:hidden"
            onClick={cutFillers}
            onMouseEnter={() => setPreviewFillers(true)}
            onMouseLeave={() => setPreviewFillers(false)}
            disabled={remainingFillers === 0}
            aria-label="Remove filler words"
          >
            <SparklesIcon />
          </Button>
        </WithTooltip>
        <WithTooltip label={showCuts ? "Hide cut words" : "Show cut words"}>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("text-neutral-500", !showCuts && "text-primary")}
            onClick={() => setShowCuts((value) => !value)}
            aria-pressed={!showCuts}
            aria-label="Hide cut words"
          >
            {showCuts ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </WithTooltip>
      </div>
    </div>
  );
}

function Clock() {
  const { timeline } = useEditor();
  const position = useEditedPosition();
  return (
    <p className="text-xs text-neutral-500 tabular-nums">
      <span className="font-medium text-neutral-900">
        {formatTimecode(position)}
      </span>
      <span className="mx-1 text-neutral-300">/</span>
      {formatTime(timeline.duration)}
    </p>
  );
}
