"use client";

import type { CommentBody, ThreadData } from "@liveblocks/client";
import { useThreads, useUser } from "@liveblocks/react/suspense";
import { memo } from "react";
import { useEditorUi } from "@/components/editor-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayback } from "@/hooks/use-playback";
import { formatTime, rulerStep } from "@/lib/timeline";

/** Time ticks, labelled every few seconds depending on the zoom level. */
export const RulerTicks = memo(function RulerTicks({
  pixelsPerSecond,
  seconds,
}: {
  pixelsPerSecond: number;
  seconds: number;
}) {
  const { major, minor } = rulerStep(pixelsPerSecond);
  const ticks: { time: number; major: boolean }[] = [];
  const count = Math.ceil(seconds / minor);
  for (let index = 0; index <= count; index++) {
    const time = index * minor;
    ticks.push({
      time,
      major: Math.abs(time / major - Math.round(time / major)) < 1e-6,
    });
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {ticks.map(({ time, major }) => (
        <div
          key={time}
          className="absolute bottom-0"
          style={{ left: time * pixelsPerSecond }}
        >
          <div
            className={
              major ? "h-2 w-px bg-neutral-400" : "h-1 w-px bg-neutral-300"
            }
          />
          {major ? (
            <span className="absolute bottom-2.5 left-1 text-[10px] leading-none font-medium text-neutral-500 tabular">
              {formatTime(time)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
});

/** Every open comment thread, pinned to its time on the ruler. */
export function CommentMarkers({
  pixelsPerSecond,
}: {
  pixelsPerSecond: number;
}) {
  const { threads } = useThreads({ query: { resolved: false } });
  return (
    <>
      {threads.map((thread) => (
        <CommentMarker
          key={thread.id}
          thread={thread}
          pixelsPerSecond={pixelsPerSecond}
        />
      ))}
    </>
  );
}

function CommentMarker({
  thread,
  pixelsPerSecond,
}: {
  thread: ThreadData;
  pixelsPerSecond: number;
}) {
  const playback = usePlayback();
  const { openSidePanel, setActiveThreadId } = useEditorUi();
  const first = thread.comments.find((comment) => !comment.deletedAt);
  const { user } = useUser(first?.userId ?? "");
  const replies = thread.comments.length - 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Comment at ${formatTime(thread.metadata.time)}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            playback.pause();
            playback.seek(thread.metadata.time);
            openSidePanel("comments");
            setActiveThreadId(thread.id);
          }}
          className="absolute top-0.5 z-20 -translate-x-1/2 cursor-pointer transition-transform hover:scale-110"
          style={{ left: thread.metadata.time * pixelsPerSecond }}
        >
          <span className="block size-[18px] overflow-hidden rounded-full rounded-bl-none bg-brand p-px shadow-sm ring-2 ring-white">
            {user ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt=""
                className="size-full rounded-full rounded-bl-none"
                draggable={false}
              />
            ) : null}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 flex-col items-start gap-0.5">
        <span>
          {user?.name ?? "Someone"} · {formatTime(thread.metadata.time)}
        </span>
        <span className="line-clamp-2 font-normal text-white/70">
          {first?.body ? commentText(first.body) : ""}
          {replies > 0
            ? ` (+${replies} ${replies === 1 ? "reply" : "replies"})`
            : ""}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function commentText(body: CommentBody) {
  return body.content
    .map((block) =>
      block.children
        .map((inline) => {
          if ("text" in inline) return inline.text;
          if (inline.type === "link") return inline.text ?? inline.url;
          return "@…";
        })
        .join("")
    )
    .join(" ");
}
