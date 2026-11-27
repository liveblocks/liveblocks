"use client";

import { useOthers, useStorage, useThreads } from "@liveblocks/react/suspense";
import { BookmarkIcon, ScissorsIcon } from "lucide-react";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { formatTime } from "@/lib/format";
import { paragraphTime } from "@/hooks/use-chapters";
import {
  getSpeaker,
  PARAGRAPHS,
  WORDS,
  wordAtTime,
  type Paragraph,
} from "@/lib/transcript";
import { cn } from "@/lib/utils";
import {
  useCurrentWord,
  useEditor,
  usePlayerState,
  type WordRange,
} from "./editor-context";
import { SelectionToolbar } from "./selection-toolbar";
import { SpeakerAvatar } from "./speaker-avatar";
import { SpeakerName } from "./speaker-name";

type Caret = {
  connectionId: number;
  name: string;
  color: string;
  playing: boolean;
};

/**
 * The script of the episode, and the main way to edit it: select words and
 * cut them, like text. Each word is a span carrying its own state, so the
 * browser's native selection maps straight to a range of words.
 */
export function Transcript() {
  const {
    engine,
    timeline,
    cuts,
    showCuts,
    selection,
    setSelection,
    draft,
    activeThreadId,
    hoveredThreadId,
    setActiveThreadId,
    setPanel,
    setPanelOpen,
    previewFillers,
    seekToWord,
    toggleCut,
  } = useEditor();
  const { playing } = usePlayerState();
  const currentWord = useCurrentWord();
  const others = useOthers();
  const { threads } = useThreads();
  const chapters = useStorage((root) => root.chapters);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(
    null
  );
  // Scrolling by hand pauses "follow the playhead" for a moment.
  const scrolledAt = useRef(0);

  // Chapters by the paragraph they start.
  const chapterByParagraph = useMemo(() => {
    const result = new Map<string, string>();
    for (const chapter of Object.values(chapters)) {
      result.set(chapter.paragraphId, chapter.title);
    }
    return result;
  }, [chapters]);

  // Which comment thread each word belongs to (open threads only).
  const commentByWord = useMemo(() => {
    const result = new Map<number, string>();
    for (const thread of threads) {
      if (thread.resolved) {
        continue;
      }
      const { startWord, endWord } = thread.metadata;
      for (let index = startWord; index <= endWord; index++) {
        result.set(index, thread.id);
      }
    }
    return result;
  }, [threads]);

  // The range to emphasize: the comment being written, or the thread that's
  // hovered or open in the side panel.
  const emphasized = useMemo<WordRange | null>(() => {
    if (draft) {
      return draft;
    }
    const thread = threads.find(
      (item) => item.id === (hoveredThreadId ?? activeThreadId)
    );
    return thread
      ? { start: thread.metadata.startWord, end: thread.metadata.endWord }
      : null;
  }, [draft, threads, hoveredThreadId, activeThreadId]);

  // Other people's selections (tinted with their color) and playheads.
  const { otherSelection, carets } = useMemo(() => {
    const otherSelection = new Map<number, string>();
    const carets = new Map<number, Caret[]>();
    for (const other of others) {
      const { selection: range, playhead, playing } = other.presence;
      if (range) {
        for (let index = range.start; index <= range.end; index++) {
          if (!otherSelection.has(index)) {
            otherSelection.set(index, other.info.color);
          }
        }
      }
      if (playhead > 0 || playing) {
        const index = wordAtTime(playhead);
        const list = carets.get(index) ?? [];
        list.push({
          connectionId: other.connectionId,
          name: other.info.name.split(" ")[0],
          color: other.info.color,
          playing,
        });
        carets.set(index, list);
      }
    }
    return { otherSelection, carets };
  }, [others]);

  // Map the browser's text selection to a range of words.
  useEffect(() => {
    const onSelectionChange = () => {
      const content = contentRef.current;
      const domSelection = document.getSelection();
      if (!content || !domSelection || domSelection.rangeCount === 0) {
        return;
      }
      const range = domSelection.getRangeAt(0);
      const words =
        domSelection.isCollapsed || !range.intersectsNode(content)
          ? null
          : rangeToWords(content, range);
      setSelection(words);
      if (!words) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      setToolbar({
        top: rect.top - contentRect.top - 8,
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - contentRect.left, 120),
          contentRect.width - 120
        ),
      });
      // Like an audio editor: selecting moves the playhead to the selection.
      if (!engine.isPlaying()) {
        engine.seek(WORDS[words.start].start);
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [engine, setSelection]);

  // Follow the playhead while playing, unless the user is scrolling.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!playing || !scroller || Date.now() - scrolledAt.current < 3000) {
      return;
    }
    const word = scroller.querySelector(`[data-word="${currentWord}"]`);
    if (!word) {
      return;
    }
    const wordRect = word.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    if (
      wordRect.top < scrollerRect.top + 40 ||
      wordRect.bottom > scrollerRect.bottom - 40
    ) {
      word.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentWord, playing]);

  const clearSelection = () => {
    document.getSelection()?.removeAllRanges();
    setSelection(null);
    setToolbar(null);
  };

  return (
    <div
      ref={scrollRef}
      className="scroll-quiet relative min-h-0 flex-1 overflow-y-auto"
      onWheel={() => (scrolledAt.current = Date.now())}
      onTouchMove={() => (scrolledAt.current = Date.now())}
    >
      <div
        ref={contentRef}
        className="transcript relative mx-auto w-full max-w-[700px] px-6 pt-6 pb-24 sm:px-10"
        onClick={(event) => {
          const domSelection = document.getSelection();
          if (domSelection && !domSelection.isCollapsed) {
            return;
          }
          const target =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-word]")
              : null;
          if (!target) {
            return;
          }
          const index = Number(target.dataset.word);
          seekToWord(index);
          const threadId = commentByWord.get(index);
          if (threadId) {
            setActiveThreadId(threadId);
            setPanel("comments");
            setPanelOpen(true);
          }
        }}
      >
        {PARAGRAPHS.map((paragraph) => {
          const chapter = chapterByParagraph.get(paragraph.id);
          return (
            <Fragment key={paragraph.id}>
              {chapter !== undefined ? (
                <ChapterHeading
                  title={chapter}
                  time={paragraphTime(paragraph, timeline, cuts)}
                  onSeek={() => seekToWord(paragraph.words[0].index)}
                />
              ) : null}
              <ParagraphView
                paragraph={paragraph}
                time={paragraphTime(paragraph, timeline, cuts)}
                onSeek={() => seekToWord(paragraph.words[0].index)}
                onRestore={(range) => toggleCut(range)}
                cuts={cuts}
                showCuts={showCuts}
                currentWord={currentWord}
                commentByWord={commentByWord}
                emphasized={emphasized}
                previewFillers={previewFillers}
                otherSelection={otherSelection}
                carets={carets}
              />
            </Fragment>
          );
        })}

        {selection && toolbar ? (
          <SelectionToolbar
            range={selection}
            top={toolbar.top}
            left={toolbar.left}
            onDone={clearSelection}
          />
        ) : null}
      </div>
    </div>
  );
}

function ChapterHeading({
  title,
  time,
  onSeek,
}: {
  title: string;
  time: number | null;
  onSeek: () => void;
}) {
  return (
    <div className="mt-10 mb-4 flex items-center gap-3 select-none first:mt-0">
      <button
        type="button"
        onClick={onSeek}
        className="flex cursor-pointer items-center gap-1.5 rounded-md text-[13px] font-semibold text-neutral-900 outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <BookmarkIcon className="size-3.5 text-primary" />
        {title || "Untitled chapter"}
      </button>
      <span className="text-xs text-neutral-400 tabular-nums">
        {time === null ? "Cut" : formatTime(time)}
      </span>
      <span className="h-px flex-1 bg-neutral-950/7" />
    </div>
  );
}

function ParagraphView({
  paragraph,
  time,
  onSeek,
  onRestore,
  cuts,
  showCuts,
  currentWord,
  commentByWord,
  emphasized,
  previewFillers,
  otherSelection,
  carets,
}: {
  paragraph: Paragraph;
  time: number | null;
  onSeek: () => void;
  onRestore: (range: WordRange) => void;
  cuts: ReadonlySet<number>;
  showCuts: boolean;
  currentWord: number;
  commentByWord: Map<number, string>;
  emphasized: WordRange | null;
  previewFillers: boolean;
  otherSelection: Map<number, string>;
  carets: Map<number, Caret[]>;
}) {
  const { speakerName } = useEditor();
  const speaker = getSpeaker(paragraph.speakerId);
  const name = speakerName(paragraph.speakerId);
  const allCut = paragraph.words.every((word) => cuts.has(word.index));

  const content: ReactNode[] = [];
  let hiddenRun: number[] = [];

  // With cuts hidden, each run of cut words collapses to a small marker
  // that restores them.
  const flushHidden = () => {
    if (hiddenRun.length === 0) {
      return;
    }
    const range = { start: hiddenRun[0], end: hiddenRun[hiddenRun.length - 1] };
    const count = hiddenRun.length;
    content.push(
      <button
        key={`cut-${range.start}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRestore(range);
        }}
        title={`Restore ${count} cut word${count === 1 ? "" : "s"}`}
        className="mx-0.5 inline-flex h-5 cursor-pointer items-center gap-0.5 rounded-full bg-rose-50 px-1.5 align-[1px] text-[11px] font-medium text-rose-500 select-none hover:bg-rose-100"
      >
        <ScissorsIcon className="size-3" />
        {count}
      </button>,
      " "
    );
    hiddenRun = [];
  };

  for (const word of paragraph.words) {
    const cut = cuts.has(word.index);
    if (cut && !showCuts) {
      hiddenRun.push(word.index);
      continue;
    }
    flushHidden();

    const threadId = commentByWord.get(word.index);
    const isEmphasized =
      emphasized !== null &&
      word.index >= emphasized.start &&
      word.index <= emphasized.end;
    const otherColor = otherSelection.get(word.index);

    for (const caret of carets.get(word.index) ?? []) {
      content.push(
        <span
          key={`caret-${caret.connectionId}`}
          className="presence-caret"
          data-playing={caret.playing ? "" : undefined}
          style={{ "--other-color": caret.color }}
          aria-hidden
        >
          <span className="presence-caret-label">{caret.name}</span>
        </span>
      );
    }

    content.push(
      <span
        key={word.id}
        data-word={word.index}
        data-cut={cut ? "" : undefined}
        data-current={word.index === currentWord ? "" : undefined}
        data-comment={
          isEmphasized ? "active" : threadId !== undefined ? "" : undefined
        }
        data-filler-preview={
          previewFillers && word.filler && !cut ? "" : undefined
        }
        data-other-selection={otherColor ? "" : undefined}
        style={otherColor ? { "--other-color": otherColor } : undefined}
        className="word"
      >
        {word.text}
      </span>,
      " "
    );
  }
  flushHidden();

  return (
    <div className={cn("group mb-6", allCut && !showCuts && "opacity-60")}>
      <div className="mb-1 flex items-center gap-2 select-none">
        <SpeakerAvatar name={name} color={speaker.color} className="size-5" />
        <SpeakerName
          speakerId={paragraph.speakerId}
          className="cursor-pointer rounded-sm text-[13px] font-semibold text-neutral-900 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onSeek}
          className="cursor-pointer rounded-sm text-xs text-neutral-400 tabular-nums outline-none hover:text-neutral-700 focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {time === null ? "Cut" : formatTime(time)}
        </button>
      </div>
      <p>{content}</p>
    </div>
  );
}

/**
 * The words a DOM range covers. Words the range only touches (it ends right
 * before them, or starts right after them) don't count.
 */
function rangeToWords(container: HTMLElement, range: Range): WordRange | null {
  let start = -1;
  let end = -1;
  for (const span of container.querySelectorAll<HTMLElement>("[data-word]")) {
    if (!range.intersectsNode(span)) {
      continue;
    }
    const text = span.firstChild;
    const endsBefore =
      (range.endContainer === text || range.endContainer === span) &&
      range.endOffset === 0;
    const startsAfter =
      range.startContainer === text &&
      range.startOffset === (text?.textContent?.length ?? 0);
    if (endsBefore || startsAfter) {
      continue;
    }
    const index = Number(span.dataset.word);
    if (start === -1) {
      start = index;
    }
    end = index;
  }
  return start === -1 ? null : { start, end };
}
