"use client";

import type { ThreadData } from "@liveblocks/client";
import { useCreateThread, useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";
import { MessageCircleIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditorUi } from "@/components/editor-context";
import { usePlayback, usePlaybackTime } from "@/hooks/use-playback";
import { formatTime } from "@/lib/timeline";
import { cn } from "@/lib/utils";

/**
 * Review comments, each pinned to a moment of the video (thread metadata
 * `time`). They're listed in timeline order, and also show as markers on the
 * timeline's ruler.
 */
export function CommentsPanel() {
  const { threads } = useThreads();
  const [showResolved, setShowResolved] = useState(false);
  const { activeThreadId } = useEditorUi();
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () =>
      threads
        .filter((thread) => showResolved || !thread.resolved)
        .sort((a, b) => a.metadata.time - b.metadata.time),
    [threads, showResolved]
  );
  const resolvedCount = threads.filter((thread) => thread.resolved).length;

  useEffect(() => {
    if (!activeThreadId) return;
    listRef.current
      ?.querySelector(`[data-thread-id="${activeThreadId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeThreadId]);

  return (
    <>
      <div
        ref={listRef}
        className="scroll-quiet min-h-0 flex-1 overflow-y-auto"
      >
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <MessageCircleIcon className="size-4" />
            </span>
            <p className="text-[13px] font-medium text-neutral-700">
              No comments yet
            </p>
            <p className="text-xs leading-relaxed text-neutral-500">
              Pause on a moment and leave feedback. It&apos;s pinned to that
              time on the timeline.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {sorted.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                active={thread.id === activeThreadId}
              />
            ))}
          </div>
        )}
      </div>
      {resolvedCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowResolved((value) => !value)}
          className="shrink-0 cursor-pointer border-t border-neutral-950/6 py-2 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900"
        >
          {showResolved ? "Hide" : "Show"} {resolvedCount} resolved
        </button>
      ) : null}
      <NewComment />
    </>
  );
}

function ThreadItem({
  thread,
  active,
}: {
  thread: ThreadData;
  active: boolean;
}) {
  const playback = usePlayback();
  const { setActiveThreadId } = useEditorUi();

  return (
    <div
      data-thread-id={thread.id}
      className={cn(
        "relative border-b border-neutral-950/6 pt-3 transition-colors",
        active && "bg-brand-soft/60",
        thread.resolved && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() => {
          playback.pause();
          playback.seek(thread.metadata.time, { reveal: true });
          setActiveThreadId(thread.id);
        }}
        className="ml-4 inline-flex cursor-pointer items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white tabular transition hover:bg-brand"
      >
        {formatTime(thread.metadata.time)}
      </button>
      <Thread thread={thread} className="-mt-1" />
    </div>
  );
}

function NewComment() {
  const playback = usePlayback();
  const createThread = useCreateThread();
  const { setActiveThreadId } = useEditorUi();

  return (
    <div className="shrink-0 border-t border-neutral-950/6 p-3">
      <p className="mb-2 flex items-center gap-1.5 px-0.5 text-xs text-neutral-500">
        Comment at <CommentTime />
      </p>
      <Composer
        className="rounded-lg ring-1 ring-neutral-950/10"
        onFocus={() => playback.pause()}
        onComposerSubmit={({ body, attachments }, event) => {
          event.preventDefault();
          const thread = createThread({
            body,
            attachments,
            metadata: { time: Math.round(playback.time * 100) / 100 },
          });
          setActiveThreadId(thread.id);
        }}
      />
    </div>
  );
}

function CommentTime() {
  const time = usePlaybackTime();
  return (
    <span className="rounded-full bg-neutral-100 px-1.5 py-px text-[11px] font-semibold text-neutral-700 tabular">
      {formatTime(time)}
    </span>
  );
}
