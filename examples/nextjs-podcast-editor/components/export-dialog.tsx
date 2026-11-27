"use client";

import { useStorage } from "@liveblocks/react/suspense";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { useChapters } from "@/hooks/use-chapters";
import { formatDuration, formatTime } from "@/lib/format";
import { showNotes } from "@/lib/show-notes";
import { cutPoints } from "@/lib/timeline";
import { ORIGINAL_DURATION } from "@/lib/transcript";
import { encodeWav } from "@/lib/wav";
import { useEditor, usePlayerState } from "./editor-context";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

/**
 * Renders the edited episode in the browser (the same segments playback
 * uses, on an offline audio context) and downloads it as a WAV file, next to
 * the show notes generated from the chapters.
 */
export function ExportDialog() {
  const { engine, timeline } = useEditor();
  const { status } = usePlayerState();
  const title = useStorage((root) => root.episode.title);
  const chapters = useChapters();
  const [rendering, setRendering] = useState(false);
  const [copied, setCopied] = useState(false);

  const notes = showNotes(
    title,
    chapters.flatMap((chapter) =>
      chapter.time === null ? [] : [{ ...chapter, time: chapter.time }]
    )
  );
  const removed = ORIGINAL_DURATION - timeline.duration;
  const cutCount = cutPoints(timeline).length;

  const download = async () => {
    setRendering(true);
    try {
      const buffer = await engine.render();
      if (!buffer) {
        return;
      }
      const url = URL.createObjectURL(encodeWav(buffer));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(title) || "episode"}.wav`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setRendering(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <DownloadIcon />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-950/5 p-5">
          <div>
            <DialogTitle>Export episode</DialogTitle>
            <DialogDescription>
              Rendered in your browser from the original recording, with every
              cut applied.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mt-1 -mr-1 text-neutral-500"
              aria-label="Close"
            >
              <XIcon />
            </Button>
          </DialogClose>
        </div>

        <div className="scroll-quiet flex flex-col gap-5 overflow-y-auto p-5">
          <dl className="grid grid-cols-3 gap-2">
            <Stat label="Length" value={formatTime(timeline.duration)} />
            <Stat
              label="Removed"
              value={removed > 0.05 ? `−${formatDuration(removed)}` : "—"}
            />
            <Stat label="Cuts" value={String(cutCount)} />
          </dl>

          <Button
            variant="dark"
            onClick={download}
            disabled={
              status !== "ready" || rendering || timeline.duration === 0
            }
          >
            {rendering ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            {rendering ? "Rendering…" : "Download audio (WAV)"}
          </Button>

          <div>
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
            <pre className="rounded-md bg-neutral-50 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap text-neutral-600 ring-1 ring-neutral-950/5">
              {notes}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 ring-1 ring-neutral-950/5">
      <dt className="text-[11px] text-neutral-500">{label}</dt>
      <dd className="text-sm font-semibold text-neutral-900 tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
