"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThreads, useCreateThread } from "@liveblocks/react/suspense";
import { Thread } from "@liveblocks/react-ui";
import {
  parseDiffFromFile,
  type DiffLineAnnotation,
  type CodeViewDiffItem,
  type CodeViewItem,
  type CodeViewOptions,
  type FileDiffMetadata,
  type LineAnnotation,
} from "@pierre/diffs";
import { CodeView, type CodeViewHandle } from "@pierre/diffs/react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { PR_FILES, PR_TITLE, PR_BRANCH, PR_BASE } from "../pr-data";
import { InlineComposer } from "./InlineComposer";
import { extractLineContext, resolveAnnotation } from "../annotationUtils";
import { getDiffSearchMatches } from "../searchUtils";

type AnnotationMetadata =
  | { type: "thread"; threadId: string }
  | {
      type: "composer";
      filePath: string;
      lineContent: string;
      contextBefore: string;
      contextAfter: string;
      lineNumber: number;
    };

// Side is UI-only state: positions the composer in the right diff column.
// It is not stored in ThreadMetadata.
interface PendingComposer {
  filePath: string;
  lineContent: string;
  contextBefore: string;
  contextAfter: string;
  lineNumber: number;
  side: "additions" | "deletions";
}

type CodeViewInstance = NonNullable<
  ReturnType<CodeViewHandle<AnnotationMetadata>["getInstance"]>
>;

// Sorted to match the file tree's alphabetical display order so scrolling down
// in the tree always scrolls down in the code view and vice versa.
const SORTED_FILES = [...PR_FILES].sort((a, b) =>
  a.path.localeCompare(b.path, undefined, { sensitivity: "base" })
);
const FILE_PATHS = SORTED_FILES.map((f) => f.path);
const GIT_STATUS = SORTED_FILES.map((f) => ({ path: f.path, status: f.status }));
const LAYOUT_PADDING = 11;
const FILE_PATH_SET = new Set(FILE_PATHS);

const diffCache = new Map<string, FileDiffMetadata>();

function diffItemId(path: string): string {
  return `diff:${path}`;
}

function getCachedDiff(file: {
  path: string;
  oldContent: string;
  newContent: string;
}): FileDiffMetadata {
  const cacheKey = `${file.path}:${file.oldContent.length}:${file.newContent.length}`;
  const cached = diffCache.get(cacheKey);
  if (cached) return cached;
  const diff = {
    ...parseDiffFromFile(
      { name: file.path, contents: file.oldContent },
      { name: file.path, contents: file.newContent }
    ),
    cacheKey,
  };
  diffCache.set(cacheKey, diff);
  return diff;
}

export function CodeReview() {
  const { threads } = useThreads();
  const createThread = useCreateThread();
  const [pendingComposer, setPendingComposer] =
    useState<PendingComposer | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [diffSearchVisible, setDiffSearchVisible] = useState(false);
  const [diffSearchQuery, setDiffSearchQuery] = useState("");
  const [diffSearchMatchIndex, setDiffSearchMatchIndex] = useState(0);

  const codeViewRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);
  // True while a tree-click scroll animation is in flight; silences handleScroll
  // so it doesn't fight the animation by re-selecting an intermediate file.
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diffSearchInputRef = useRef<HTMLInputElement>(null);

  const filteredFilePaths = useMemo(
    () =>
      fileSearchQuery
        ? FILE_PATHS.filter((p) =>
            p.toLowerCase().includes(fileSearchQuery.toLowerCase())
          )
        : FILE_PATHS,
    [fileSearchQuery]
  );

  const { model: treeModel } = useFileTree({
    flattenEmptyDirectories: true,
    gitStatus: GIT_STATUS,
    initialExpansion: "open",
    itemHeight: 30,
    paths: FILE_PATHS,
  });

  useEffect(() => {
    treeModel.resetPaths(filteredFilePaths);
  }, [treeModel, filteredFilePaths]);

  const threadsByFile = useMemo(() => {
    const map = new Map<string, typeof threads>();
    for (const thread of threads) {
      const { filePath } = thread.metadata;
      if (!filePath) continue;
      const group = map.get(filePath);
      if (group) {
        group.push(thread);
      } else {
        map.set(filePath, [thread]);
      }
    }
    return map;
  }, [threads]);

  const items = useMemo((): CodeViewDiffItem<AnnotationMetadata>[] => {
    return SORTED_FILES.map((file) => {
      const fileDiff = getCachedDiff(file);
      const fileThreads = threadsByFile.get(file.path) ?? [];
      const annotations: DiffLineAnnotation<AnnotationMetadata>[] = [];

      for (const thread of fileThreads) {
        const resolved = resolveAnnotation(
          thread.metadata,
          file.oldContent,
          file.newContent
        );
        if (!resolved) continue;
        annotations.push({
          lineNumber: resolved.lineNumber,
          side: resolved.side,
          metadata: { type: "thread", threadId: thread.id },
        });
      }

      if (pendingComposer?.filePath === file.path) {
        annotations.push({
          lineNumber: pendingComposer.lineNumber,
          side: pendingComposer.side,
          metadata: {
            type: "composer",
            filePath: file.path,
            lineContent: pendingComposer.lineContent,
            contextBefore: pendingComposer.contextBefore,
            contextAfter: pendingComposer.contextAfter,
            lineNumber: pendingComposer.lineNumber,
          },
        });
      }

      const versionStr = annotations
        .map((a) =>
          a.metadata?.type === "thread" ? a.metadata.threadId : "composer"
        )
        .join(",");
      let version = 0;
      for (let i = 0; i < versionStr.length; i++) {
        version = (version * 31 + versionStr.charCodeAt(i)) >>> 0;
      }

      return {
        id: diffItemId(file.path),
        type: "diff",
        fileDiff,
        annotations,
        version,
      };
    });
  }, [threadsByFile, pendingComposer]);

  const diffSearchMatches = useMemo(
    () => getDiffSearchMatches(diffSearchQuery, items),
    [diffSearchQuery, items]
  );

  useEffect(() => {
    setDiffSearchMatchIndex(0);
  }, [diffSearchQuery]);

  useEffect(() => {
    if (!diffSearchMatches.length) return;
    const match = diffSearchMatches[diffSearchMatchIndex];
    if (!match) return;
    codeViewRef.current?.scrollTo({
      type: "line",
      id: match.itemId,
      lineNumber: match.lineNumber,
      side: match.side,
      align: "center",
      behavior: "smooth-auto",
    });
  }, [diffSearchMatchIndex, diffSearchMatches]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        setDiffSearchVisible(true);
        setTimeout(() => diffSearchInputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setDiffSearchVisible(false);
        setDiffSearchQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollToFile = useCallback((path: string) => {
    const itemId = diffItemId(path);
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    let attempts = 0;
    const tryScroll = () => {
      const handle = codeViewRef.current;
      const viewer = handle?.getInstance();
      if (handle && viewer && viewer.getTopForItem(itemId) != null) {
        handle.scrollTo({
          type: "item",
          id: itemId,
          behavior: "smooth-auto",
          offset: LAYOUT_PADDING,
        });
        programmaticScrollTimerRef.current = setTimeout(() => {
          programmaticScrollRef.current = false;
        }, 600);
        return;
      }
      if (attempts++ < 6) {
        requestAnimationFrame(tryScroll);
      } else {
        programmaticScrollRef.current = false;
      }
    };
    tryScroll();
  }, []);

  const handleTreeClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      for (const target of event.nativeEvent.composedPath()) {
        if (
          !("getAttribute" in target) ||
          typeof (target as Element).getAttribute !== "function"
        )
          continue;
        const path = (target as Element).getAttribute("data-item-path");
        if (path && FILE_PATH_SET.has(path)) {
          scrollToFile(path);
          return;
        }
      }
    },
    [scrollToFile]
  );

  const handleScroll = useCallback(
    (scrollTop: number, viewer: CodeViewInstance) => {
      if (programmaticScrollRef.current) return;
      let activePath: string | null = null;
      for (const path of FILE_PATHS) {
        const itemTop = viewer.getTopForItem(diffItemId(path));
        if (itemTop != null && itemTop <= scrollTop + 1) {
          activePath = path;
        }
      }
      if (!activePath) return;
      const selected = treeModel.getSelectedPaths();
      if (selected.length === 1 && selected[0] === activePath) return;
      for (const path of selected) {
        treeModel.getItem(path)?.deselect();
      }
      treeModel.getItem(activePath)?.select();
    },
    [treeModel]
  );

  const options = useMemo(
    (): CodeViewOptions<AnnotationMetadata> => ({
      diffIndicators: "bars",
      diffStyle: "split",
      enableLineSelection: false,
      hunkSeparators: "simple",
      itemMetrics: { diffHeaderHeight: 40 },
      layout: {
        gap: 12,
        paddingBottom: LAYOUT_PADDING,
        paddingTop: LAYOUT_PADDING,
      },
      lineDiffType: "char",
      stickyHeaders: true,
      themeType: "system",
      onLineClick: (props, context) => {
        if (props.type !== "diff-line" || context.type !== "diff") return;
        const file = SORTED_FILES.find((f) => diffItemId(f.path) === context.item.id);
        if (!file) return;
        const side = props.annotationSide;
        const content = side === "additions" ? file.newContent : file.oldContent;
        const { lineContent, contextBefore, contextAfter } = extractLineContext(
          content,
          props.lineNumber
        );
        setPendingComposer({
          filePath: file.path,
          lineContent,
          contextBefore,
          contextAfter,
          lineNumber: props.lineNumber,
          side,
        });
      },
    }),
    []
  );

  const renderAnnotation = useCallback(
    (
      annotation:
        | LineAnnotation<AnnotationMetadata>
        | DiffLineAnnotation<AnnotationMetadata>,
      item: CodeViewItem<AnnotationMetadata>
    ) => {
      if (!("side" in annotation) || item.type !== "diff") return null;
      const { metadata } = annotation;
      if (!metadata) return null;

      if (metadata.type === "composer") {
        return (
          <InlineComposer
            onSubmit={(body) => {
              createThread({
                body,
                metadata: {
                  filePath: metadata.filePath,
                  lineContent: metadata.lineContent,
                  contextBefore: metadata.contextBefore,
                  contextAfter: metadata.contextAfter,
                  lineNumber: metadata.lineNumber,
                },
              });
              setPendingComposer(null);
            }}
            onClose={() => setPendingComposer(null)}
          />
        );
      }

      const thread = threads.find((t) => t.id === metadata.threadId);
      if (!thread) return null;

      return (
        <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700">
          <div className="rounded-md overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <Thread thread={thread} />
          </div>
        </div>
      );
    },
    [threads, createThread]
  );

  const renderCustomHeader = useCallback(
    (item: CodeViewItem<AnnotationMetadata>) => {
      if (item.type !== "diff") return null;
      const file = SORTED_FILES.find((f) => diffItemId(f.path) === item.id);
      if (!file) return null;
      const fileThreadCount = (threadsByFile.get(file.path) ?? []).length;

      return (
        <div className="flex items-center gap-2 px-3 h-10 text-xs bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700">
          <span className="flex-1 min-w-0 truncate font-mono text-zinc-800 dark:text-zinc-200">
            {file.path}
          </span>
          {file.status === "added" && (
            <span className="shrink-0 px-1.5 py-0.5 font-medium rounded bg-green-100 text-green-800 border border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
              New
            </span>
          )}
          {fileThreadCount > 0 && (
            <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
              {fileThreadCount} comment{fileThreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      );
    },
    [threadsByFile]
  );

  const validThreadCount = useMemo(
    () =>
      [...threadsByFile.values()].reduce((sum, group) => sum + group.length, 0),
    [threadsByFile]
  );

  function navigateDiffSearch(direction: 1 | -1) {
    if (!diffSearchMatches.length) return;
    setDiffSearchMatchIndex(
      (i) =>
        (i + direction + diffSearchMatches.length) % diffSearchMatches.length
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950">
      <aside className="w-60 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        <div className="px-3 h-10 flex items-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          Files changed
        </div>
        <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <input
            type="text"
            value={fileSearchQuery}
            onChange={(e) => setFileSearchQuery(e.target.value)}
            placeholder="Filter files…"
            className="w-full px-2 py-1 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 border border-transparent focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-600"
          />
        </div>
        <div className="flex-1 min-h-0 pt-2" onClick={handleTreeClick}>
          <FileTree model={treeModel} />
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {PR_TITLE}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
              Open
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1">
              <span>⎇</span>
              <code className="px-1 py-0.5 rounded font-mono bg-blue-50 text-blue-700 border border-zinc-200 dark:bg-zinc-800 dark:text-blue-300 dark:border-zinc-700">
                {PR_BRANCH}
              </code>
              <span>→</span>
              <code className="px-1 py-0.5 rounded font-mono bg-blue-50 text-blue-700 border border-zinc-200 dark:bg-zinc-800 dark:text-blue-300 dark:border-zinc-700">
                {PR_BASE}
              </code>
            </span>
            <span>{PR_FILES.length} files changed</span>
            <span>
              {validThreadCount} comment{validThreadCount !== 1 ? "s" : ""}
            </span>
          </div>
        </header>
        {diffSearchVisible && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <input
              ref={diffSearchInputRef}
              type="text"
              value={diffSearchQuery}
              onChange={(e) => setDiffSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigateDiffSearch(e.shiftKey ? -1 : 1);
                }
              }}
              placeholder="Search in diff…"
              className="flex-1 min-w-0 px-2 py-1 text-xs rounded-md bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
            />
            <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
              {diffSearchQuery && diffSearchMatches.length === 0
                ? "No results"
                : diffSearchMatches.length > 0
                  ? `${diffSearchMatchIndex + 1} / ${diffSearchMatches.length}`
                  : ""}
            </span>
            <button
              onClick={() => navigateDiffSearch(-1)}
              disabled={diffSearchMatches.length === 0}
              className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30"
              aria-label="Previous match"
            >
              ↑
            </button>
            <button
              onClick={() => navigateDiffSearch(1)}
              disabled={diffSearchMatches.length === 0}
              className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30"
              aria-label="Next match"
            >
              ↓
            </button>
            <button
              onClick={() => {
                setDiffSearchVisible(false);
                setDiffSearchQuery("");
              }}
              className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
        )}
        <div className="relative flex-1">
          <CodeView
            className="absolute inset-0 overflow-y-auto"
            ref={codeViewRef}
            items={items}
            options={options}
            onScroll={handleScroll}
            renderAnnotation={renderAnnotation}
            renderCustomHeader={renderCustomHeader}
          />
        </div>
      </div>
    </div>
  );
}
