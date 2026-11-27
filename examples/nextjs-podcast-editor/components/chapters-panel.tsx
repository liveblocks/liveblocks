"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { CheckIcon, CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useChapters } from "@/hooks/use-chapters";
import { formatTime } from "@/lib/format";
import { showNotes } from "@/lib/show-notes";
import { PARAGRAPHS, WORDS } from "@/lib/transcript";
import { useCurrentWord, useEditor } from "./editor-context";
import { Button } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";

/**
 * Chapters, as they'll appear in podcast apps. Each one starts at a
 * paragraph, so its timestamp follows the edit as words are cut.
 */
export function ChaptersPanel() {
  const { seekToWord } = useEditor();
  const chapters = useChapters();
  const title = useStorage((root) => root.episode.title);
  const currentWord = useCurrentWord();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentParagraph = PARAGRAPHS[WORDS[currentWord].paragraph];
  const hasChapterHere = chapters.some(
    (chapter) => chapter.paragraphId === currentParagraph.id
  );

  const addChapter = useMutation(({ storage }, paragraphId: string) => {
    const id = `chapter-${nanoid(8)}`;
    storage
      .get("chapters")
      .set(id, new LiveObject({ id, paragraphId, title: "" }));
    return id;
  }, []);

  const renameChapter = useMutation(
    ({ storage }, id: string, title: string) => {
      storage.get("chapters").get(id)?.set("title", title);
    },
    []
  );

  const deleteChapter = useMutation(({ storage }, id: string) => {
    storage.get("chapters").delete(id);
  }, []);

  const notes = showNotes(
    title,
    chapters.flatMap((chapter) =>
      chapter.time === null ? [] : [{ ...chapter, time: chapter.time }]
    )
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <p className="text-xs font-medium text-neutral-500">
          {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
        </p>
        <WithTooltip
          label={
            hasChapterHere
              ? "This paragraph already starts a chapter"
              : "Start a chapter at the playhead’s paragraph"
          }
        >
          {/* Wrapped so the tooltip still shows while the button is disabled. */}
          <span>
            <Button
              variant="soft"
              size="xs"
              disabled={hasChapterHere}
              onClick={() => {
                setFocusId(addChapter(currentParagraph.id));
              }}
            >
              <PlusIcon />
              Add at playhead
            </Button>
          </span>
        </WithTooltip>
      </div>

      <ol className="scroll-quiet flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
        {chapters.map((chapter) => (
          <li
            key={chapter.id}
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-neutral-50"
          >
            <button
              type="button"
              onClick={() =>
                seekToWord(PARAGRAPHS[chapter.paragraphIndex].words[0].index)
              }
              className="w-11 shrink-0 cursor-pointer rounded bg-neutral-100 py-0.5 text-center text-[11px] font-medium text-neutral-600 tabular-nums outline-none hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              title="Jump to chapter"
            >
              {chapter.time === null ? "Cut" : formatTime(chapter.time)}
            </button>
            <input
              value={chapter.title}
              autoFocus={chapter.id === focusId}
              onChange={(event) =>
                renameChapter(chapter.id, event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                  event.currentTarget.blur();
                }
              }}
              placeholder="Untitled chapter"
              aria-label="Chapter title"
              className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-ring"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-neutral-400 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-red-600"
              onClick={() => deleteChapter(chapter.id)}
              aria-label="Delete chapter"
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ol>

      <div className="border-t border-neutral-950/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-500">Show notes</p>
          <Button
            variant="ghost"
            size="xs"
            className="text-neutral-600"
            onClick={async () => {
              await navigator.clipboard.writeText(notes);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="scroll-quiet max-h-36 overflow-auto rounded-md bg-neutral-50 p-2.5 font-sans text-xs leading-relaxed whitespace-pre-wrap text-neutral-600 ring-1 ring-neutral-950/5">
          {notes}
        </pre>
        <p className="mt-2 text-[11px] text-neutral-400">
          Timestamps follow the edit: cut words before a chapter and it moves
          earlier.
        </p>
      </div>
    </div>
  );
}
