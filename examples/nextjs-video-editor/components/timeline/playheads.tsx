"use client";

import { shallow } from "@liveblocks/client";
import { useOthersMapped } from "@liveblocks/react/suspense";
import { MousePointer2Icon } from "lucide-react";
import { usePlaybackTime } from "@/hooks/use-playback";
import { HEADER_WIDTH, RULER_HEIGHT } from "@/components/timeline/constants";

/** Your playhead: the only part of the timeline that renders every frame. */
export function Playhead({ pixelsPerSecond }: { pixelsPerSecond: number }) {
  const time = usePlaybackTime();
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-30"
      style={{
        left: HEADER_WIDTH,
        transform: `translateX(${time * pixelsPerSecond}px)`,
      }}
    >
      <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-neutral-900" />
      <svg
        width="13"
        height="17"
        viewBox="0 0 13 17"
        className="absolute top-1 -left-[6.5px] drop-shadow-sm"
        aria-hidden
      >
        <path
          d="M0 3a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v7.2a3 3 0 0 1-.9 2.1L7.6 16.5a1.5 1.5 0 0 1-2.2 0L.9 12.3A3 3 0 0 1 0 10.2V3Z"
          className="fill-neutral-900"
        />
      </svg>
    </div>
  );
}

/**
 * Everyone else's playhead, in their color. Remote playheads update ten
 * times a second while playing; the transition fills in between.
 */
export function OtherPlayheads({
  pixelsPerSecond,
}: {
  pixelsPerSecond: number;
}) {
  const others = useOthersMapped(
    (other) => ({
      playhead: other.presence.playhead,
      playing: other.presence.playing,
      name: other.info.name,
      avatar: other.info.avatar,
      color: other.info.color,
    }),
    shallow
  );

  return (
    <>
      {others.map(([connectionId, other]) => (
        <div
          key={connectionId}
          className="group/playhead pointer-events-none absolute top-0 bottom-0 z-20"
          style={{
            left: HEADER_WIDTH,
            transform: `translateX(${other.playhead * pixelsPerSecond}px)`,
            transition: other.playing
              ? "transform 110ms linear"
              : "transform 60ms ease-out",
          }}
        >
          <div
            className="absolute bottom-0 -left-px w-0.5 opacity-70"
            style={{ top: RULER_HEIGHT, background: other.color }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={other.avatar}
            alt={other.name}
            title={other.name}
            className="absolute top-[5px] -left-[9px] size-[18px] rounded-full"
            style={{ boxShadow: `0 0 0 2px ${other.color}` }}
            draggable={false}
          />
        </div>
      ))}
    </>
  );
}

/** Everyone else's cursor over the tracks, in timeline coordinates. */
export function OtherCursors({ pixelsPerSecond }: { pixelsPerSecond: number }) {
  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      name: other.info.name,
      color: other.info.color,
    }),
    shallow
  );

  return (
    <>
      {others.map(([connectionId, other]) =>
        other.cursor ? (
          <div
            key={connectionId}
            className="pointer-events-none absolute top-0 left-0 z-40 transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${HEADER_WIDTH + other.cursor.time * pixelsPerSecond}px, ${RULER_HEIGHT + other.cursor.y}px)`,
            }}
          >
            <MousePointer2Icon
              className="size-4 -translate-x-[3px] -translate-y-[3px] drop-shadow-sm"
              style={{ color: other.color, fill: other.color }}
              stroke="white"
              strokeWidth={1.5}
            />
            <span
              className="absolute top-3.5 left-3 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap text-white shadow-sm"
              style={{ background: other.color }}
            >
              {other.name.split(" ")[0]}
            </span>
          </div>
        ) : null
      )}
    </>
  );
}
