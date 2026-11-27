"use client";

import { shallow } from "@liveblocks/client";
import { useOthersMapped, useSelf } from "@liveblocks/react/suspense";
import { PlayIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayback } from "@/hooks/use-playback";
import { formatTime } from "@/lib/timeline";

const MAX_VISIBLE = 4;

/**
 * Everyone in the project. Clicking someone moves your playhead to theirs,
 * to look at what they're looking at.
 */
export function Collaborators() {
  const playback = usePlayback();
  const self = useSelf((me) => me.info);
  const others = useOthersMapped(
    (other) => ({
      info: other.info,
      playhead: other.presence.playhead,
      playing: other.presence.playing,
    }),
    shallow
  );
  const visible = others.slice(0, MAX_VISIBLE);
  const hidden = others.length - visible.length;

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-1.5">
        {visible.map(([connectionId, other]) => (
          <Tooltip key={connectionId}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Go to ${other.info.name}'s playhead`}
                onClick={() => {
                  playback.pause();
                  playback.seek(other.playhead, { reveal: true });
                }}
                className="relative cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar
                  src={other.info.avatar}
                  name={other.info.name}
                  color={other.info.color}
                />
                {other.playing ? (
                  <span
                    className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full ring-2 ring-neutral-100"
                    style={{ background: other.info.color }}
                  >
                    <PlayIcon className="size-[7px] fill-white text-white" />
                  </span>
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="flex-col items-start gap-0"
            >
              <span>{other.info.name}</span>
              <span className="text-[11px] font-normal text-white/60">
                {other.playing ? "Playing" : "At"} {formatTime(other.playhead)}{" "}
                · Click to jump there
              </span>
            </TooltipContent>
          </Tooltip>
        ))}
        {hidden > 0 ? (
          <span className="relative flex size-7 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-600 ring-2 ring-neutral-100">
            +{hidden}
          </span>
        ) : null}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ml-1.5">
            <Avatar src={self.avatar} name={self.name} color={self.color} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{self.name} (you)</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function Avatar({
  src,
  name,
  color,
  size = 28,
}: {
  src: string;
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="relative block shrink-0 rounded-full bg-neutral-200 ring-2 ring-neutral-100"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="size-full rounded-full object-cover"
        draggable={false}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 1.5px ${color}` }}
      />
    </span>
  );
}
