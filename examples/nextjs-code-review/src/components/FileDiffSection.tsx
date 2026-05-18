"use client";

import { useState } from "react";
import { Thread } from "@liveblocks/react-ui";
import type { ComposerSubmitComment } from "@liveblocks/react-ui";
import type { ThreadData } from "@liveblocks/client";
import {
  MultiFileDiff,
  GutterUtilitySlotStyles,
  type AnnotationSide,
  type DiffLineAnnotation,
} from "@pierre/diffs/react";
import type { PrFile } from "../pr-data";
import { InlineComposer } from "./InlineComposer";

type AnnotationMetadata =
  | { type: "thread"; threadId: string }
  | { type: "composer" };

interface PendingComposer {
  filePath: string;
  lineNumber: number;
  side: AnnotationSide;
}

interface Props {
  file: PrFile;
  threads: ThreadData<Liveblocks["ThreadMetadata"]>[];
  pendingComposer: PendingComposer | null;
  onOpenComposer: (composer: PendingComposer) => void;
  onCloseComposer: () => void;
  onCreateThread: (
    filePath: string,
    lineNumber: number,
    side: AnnotationSide,
    body: ComposerSubmitComment["body"]
  ) => void;
}

export function FileDiffSection({
  file,
  threads,
  pendingComposer,
  onOpenComposer,
  onCloseComposer,
  onCreateThread,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const fileThreads = threads.filter(
    (t) => t.metadata.filePath === file.path
  );

  const stats = computeStats(file.oldContent, file.newContent);

  const lineAnnotations: DiffLineAnnotation<AnnotationMetadata>[] = [
    ...fileThreads.map((thread) => ({
      side: thread.metadata.side as AnnotationSide,
      lineNumber: thread.metadata.lineNumber,
      metadata: { type: "thread" as const, threadId: thread.id },
    })),
    ...(pendingComposer?.filePath === file.path
      ? [
          {
            side: pendingComposer.side,
            lineNumber: pendingComposer.lineNumber,
            metadata: { type: "composer" as const },
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs bg-zinc-50 border-b border-zinc-200 cursor-pointer select-none hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-700 dark:hover:bg-zinc-800"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="text-[10px] text-zinc-400 shrink-0">
          {collapsed ? "▶" : "▼"}
        </span>
        <span className="flex-1 min-w-0 truncate font-mono text-xs text-zinc-800 dark:text-zinc-200">
          {file.path}
        </span>
        {file.status === "added" && (
          <span className="shrink-0 px-1.5 py-0.5 text-[11px] font-medium rounded bg-green-100 text-green-800 border border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
            New
          </span>
        )}
        <span className="shrink-0 flex gap-1 font-mono text-[11px]">
          <span className="text-green-700 dark:text-green-500">
            +{stats.additions}
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{stats.deletions}
          </span>
        </span>
        {fileThreads.length > 0 && (
          <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
            {fileThreads.length} comment{fileThreads.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!collapsed && (
        <MultiFileDiff
          oldFile={{ name: file.path, contents: file.oldContent }}
          newFile={{ name: file.path, contents: file.newContent }}
          options={{ enableGutterUtility: true }}
          lineAnnotations={lineAnnotations}
          renderAnnotation={(annotation) => {
            const { metadata } = annotation;
            if (metadata.type === "composer") {
              if (!pendingComposer) return null;
              return (
                <InlineComposer
                  filePath={pendingComposer.filePath}
                  lineNumber={pendingComposer.lineNumber}
                  side={pendingComposer.side}
                  onSubmit={onCreateThread}
                  onClose={onCloseComposer}
                />
              );
            }

            const thread = fileThreads.find(
              (t) => t.id === metadata.threadId
            );
            if (!thread) return null;
            return (
              <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700">
                <div className="rounded-md overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                  <Thread thread={thread} />
                </div>
              </div>
            );
          }}
          renderGutterUtility={(getHoveredLine) => (
            <button
              className="flex items-center justify-center size-5 rounded bg-blue-600 text-white cursor-pointer transition-colors hover:bg-blue-700 border-0 p-0"
              style={GutterUtilitySlotStyles}
              title="Add a comment"
              onClick={() => {
                const line = getHoveredLine();
                if (!line) return;
                onOpenComposer({
                  filePath: file.path,
                  lineNumber: line.lineNumber,
                  side: line.side,
                });
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
              </svg>
            </button>
          )}
        />
      )}
    </div>
  );
}

function computeStats(
  oldContent: string,
  newContent: string
): { additions: number; deletions: number } {
  if (!oldContent) {
    return { additions: newContent.split("\n").length, deletions: 0 };
  }
  if (!newContent) {
    return { additions: 0, deletions: oldContent.split("\n").length };
  }

  const oldLines = new Set(oldContent.split("\n"));
  const newLines = new Set(newContent.split("\n"));

  let additions = 0;
  let deletions = 0;

  for (const line of newContent.split("\n")) {
    if (!oldLines.has(line)) additions++;
  }
  for (const line of oldContent.split("\n")) {
    if (!newLines.has(line)) deletions++;
  }

  return { additions, deletions };
}
