"use client";

import type { ThreadData } from "@liveblocks/client";
import { useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";
import { MessageSquareDashedIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { formatTime } from "@/lib/format";
import { toEdited } from "@/lib/timeline";
import { excerpt, spanStart } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import { useEditor, type WordRange } from "./editor-context";
import { Button } from "./ui/button";

/**
 * The episode's comments. Each thread is anchored to the words it was
 * written about (in its metadata), so it's listed in script order and
 * highlights its words in the transcript.
 */
export function CommentsPanel() {
  const { threads } = useThreads();
  const { draft, setDraft, activeThreadId } = useEditor();
  const [showResolved, setShowResolved] = useState(false);

  const visible = threads
    .filter((thread) => thread.resolved === showResolved)
    .sort((a, b) => a.metadata.startWord - b.metadata.startWord);
  const resolvedCount = threads.filter((thread) => thread.resolved).length;

  useEffect(() => {
    if (activeThreadId) {
      document
        .getElementById(`thread-${activeThreadId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeThreadId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-xs font-medium text-neutral-500">
          {showResolved
            ? `${visible.length} resolved`
            : `${visible.length} open`}
        </p>
        {resolvedCount > 0 || showResolved ? (
          <button
            type="button"
            onClick={() => setShowResolved((value) => !value)}
            className="cursor-pointer rounded-sm text-xs font-medium text-neutral-500 outline-none hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showResolved ? "Show open" : `Show resolved (${resolvedCount})`}
          </button>
        ) : null}
      </div>

      <div className="scroll-quiet flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {draft ? (
          <DraftCard range={draft} onDone={() => setDraft(null)} />
        ) : null}

        {visible.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}

        {visible.length === 0 && !draft ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <MessageSquareDashedIcon className="size-5 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-900">
              {showResolved ? "No resolved comments" : "No comments yet"}
            </p>
            <p className="text-xs text-balance text-neutral-500">
              Select words in the transcript and choose{" "}
              <span className="font-medium text-neutral-700">Comment</span> to
              leave feedback on that moment.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Quote({ range }: { range: WordRange }) {
  const { timeline, seekToWord } = useEditor();
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        seekToWord(range.start);
        document
          .querySelector(`[data-word="${range.start}"]`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }}
      className="flex w-full cursor-pointer items-start gap-2 rounded-t-lg border-b border-neutral-950/5 px-3 py-2 text-left outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="mt-px shrink-0 rounded bg-amber-100 px-1 text-[11px] font-medium text-amber-800 tabular-nums">
        {formatTime(toEdited(timeline, spanStart(range.start)))}
      </span>
      <span className="line-clamp-2 text-xs text-neutral-600 italic">
        “{excerpt(range.start, range.end)}”
      </span>
    </button>
  );
}

function ThreadCard({ thread }: { thread: ThreadData }) {
  const { activeThreadId, setActiveThreadId, setHoveredThreadId } = useEditor();
  const active = activeThreadId === thread.id;

  return (
    <div
      id={`thread-${thread.id}`}
      onMouseEnter={() => setHoveredThreadId(thread.id)}
      onMouseLeave={() => setHoveredThreadId(null)}
      onClick={() => setActiveThreadId(thread.id)}
      className={cn(
        "comment-card shrink-0 rounded-lg bg-white shadow-xs ring-1 ring-neutral-950/8 transition-shadow",
        active && "ring-2 ring-amber-400"
      )}
    >
      <Quote
        range={{
          start: thread.metadata.startWord,
          end: thread.metadata.endWord,
        }}
      />
      <Thread thread={thread} showComposer="collapsed" />
    </div>
  );
}

function DraftCard({
  range,
  onDone,
}: {
  range: WordRange;
  onDone: () => void;
}) {
  return (
    <div className="comment-card relative shrink-0 rounded-lg bg-white shadow-xs ring-2 ring-amber-400">
      <Quote range={range} />
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-1 right-1 bg-white text-neutral-400"
        onClick={onDone}
        aria-label="Cancel comment"
      >
        <XIcon />
      </Button>
      <Composer
        metadata={{ startWord: range.start, endWord: range.end }}
        autoFocus
        onComposerSubmit={() => onDone()}
        overrides={{ COMPOSER_PLACEHOLDER: "Comment on this moment…" }}
      />
    </div>
  );
}
