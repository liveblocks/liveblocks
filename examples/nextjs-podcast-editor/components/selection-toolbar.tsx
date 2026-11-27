"use client";

import {
  MessageSquarePlusIcon,
  PlayIcon,
  ScissorsIcon,
  Undo2Icon,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatDuration } from "@/lib/format";
import { spanEnd, spanStart, WORDS } from "@/lib/transcript";
import { useEditor, type WordRange } from "./editor-context";
import { WithTooltip } from "./ui/tooltip";

/** Floats above the selected words: play, cut (or restore), comment. */
export function SelectionToolbar({
  range,
  top,
  left,
  onDone,
}: {
  range: WordRange;
  top: number;
  left: number;
  onDone: () => void;
}) {
  const { engine, cuts, toggleCut, startComment } = useEditor();

  let allCut = true;
  let length = 0;
  for (let index = range.start; index <= range.end; index++) {
    allCut &&= cuts.has(index);
    if (!cuts.has(index)) {
      length += spanEnd(index) - spanStart(index);
    }
  }
  const count = range.end - range.start + 1;

  return (
    <div
      className="popup-animate absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg bg-neutral-900 p-1 text-white shadow-lg select-none"
      data-side="top"
      data-state="open"
      style={{ top, left }}
      // Keep the text selection when clicking the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="px-2 text-xs text-neutral-400 tabular-nums">
        {count} word{count === 1 ? "" : "s"}
        {allCut ? "" : ` · ${formatDuration(length)}`}
      </span>
      <ToolbarButton
        label="Play from here"
        shortcut="Space"
        onClick={() => {
          engine.seek(WORDS[range.start].start);
          void engine.play();
        }}
      >
        <PlayIcon className="fill-current" />
      </ToolbarButton>
      <ToolbarButton
        label={allCut ? "Restore" : "Cut"}
        shortcut="⌫"
        onClick={() => {
          toggleCut(range);
          onDone();
        }}
        text={allCut ? "Restore" : "Cut"}
      >
        {allCut ? <Undo2Icon /> : <ScissorsIcon />}
      </ToolbarButton>
      <ToolbarButton
        label="Comment"
        onClick={() => {
          startComment(range);
          onDone();
        }}
        text="Comment"
      >
        <MessageSquarePlusIcon />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  shortcut,
  text,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  text?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <WithTooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40 [&_svg]:size-3.5"
      >
        {children}
        {text ? <span>{text}</span> : null}
      </button>
    </WithTooltip>
  );
}
