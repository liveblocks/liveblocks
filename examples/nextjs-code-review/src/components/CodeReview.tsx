"use client";

import { useState } from "react";
import { useThreads, useCreateThread } from "@liveblocks/react/suspense";
import type { ComposerSubmitComment } from "@liveblocks/react-ui";
import type { AnnotationSide } from "@pierre/diffs/react";
import { PR_FILES, PR_TITLE, PR_BRANCH, PR_BASE } from "../pr-data";
import { FileDiffSection } from "./FileDiffSection";

interface PendingComposer {
  filePath: string;
  lineNumber: number;
  side: AnnotationSide;
}

export function CodeReview() {
  const { threads } = useThreads();
  const createThread = useCreateThread();
  const [pendingComposer, setPendingComposer] =
    useState<PendingComposer | null>(null);

  function handleCreateThread(
    filePath: string,
    lineNumber: number,
    side: AnnotationSide,
    body: ComposerSubmitComment["body"]
  ) {
    createThread({
      body,
      metadata: { filePath, lineNumber, side },
    });
    setPendingComposer(null);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
      <header className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {PR_TITLE}
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
            Open
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="text-sm">⎇</span>
            <code className="px-1 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-zinc-200 dark:bg-zinc-800 dark:text-blue-300 dark:border-zinc-700">
              {PR_BRANCH}
            </code>
            <span>→</span>
            <code className="px-1 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-zinc-200 dark:bg-zinc-800 dark:text-blue-300 dark:border-zinc-700">
              {PR_BASE}
            </code>
          </span>
          <span>
            {PR_FILES.length} file{PR_FILES.length !== 1 ? "s" : ""} changed
          </span>
          <span>
            {threads.length} comment{threads.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {PR_FILES.map((file) => (
          <FileDiffSection
            key={file.path}
            file={file}
            threads={threads.filter(
              (t) => t.metadata.filePath === file.path
            )}
            pendingComposer={pendingComposer}
            onOpenComposer={setPendingComposer}
            onCloseComposer={() => setPendingComposer(null)}
            onCreateThread={handleCreateThread}
          />
        ))}
      </div>
    </main>
  );
}
