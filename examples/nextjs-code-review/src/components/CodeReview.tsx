"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties } from "react";
import { useThreads, useCreateThread } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";
import {
  parseDiffFromFile,
  type AnnotationSide,
  type CodeViewDiffItem,
  type CodeViewItem,
  type CodeViewLineSelection,
  type CodeViewOptions,
  type DiffLineAnnotation,
  type FileDiffMetadata,
  type LineAnnotation,
  type SelectedLineRange,
} from "@pierre/diffs";
import { CodeView, type CodeViewHandle } from "@pierre/diffs/react";
import {
  IconCodeStyleBg,
  IconConvoFill,
  IconFileTree,
  IconPlus,
} from "@pierre/icons";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { PR_FILES, PR_TITLE, PR_BRANCH, PR_BASE } from "../pr-data";

type DiffStyle = "split" | "unified";
type SidebarTab = "files" | "comments";

type AnnotationMetadata =
  | {
      type: "thread";
      threadId: string;
      range: SelectedLineRange;
    }
  | {
      type: "composer";
      key: string;
      filePath: string;
      lineContent: string;
      contextBefore: string;
      contextAfter: string;
      lineNumber: number;
      range: SelectedLineRange;
    };

interface PendingComposer {
  key: string;
  filePath: string;
  lineContent: string;
  contextBefore: string;
  contextAfter: string;
  lineNumber: number;
  side: AnnotationSide;
  range: SelectedLineRange;
}

interface ResolvedThread {
  id: string;
  filePath: string;
  lineNumber: number;
  side: AnnotationSide;
  range: SelectedLineRange;
  itemId: string;
  thread: ThreadData;
}

interface AnnotationAnchor {
  lineContent: string;
  contextBefore: string;
  contextAfter: string;
  lineNumber: number;
}

interface ResolvedAnnotation {
  lineNumber: number;
  side: AnnotationSide;
}

type ThreadData = ReturnType<typeof useThreads>["threads"][number];
type ThreadMetadata = ThreadData["metadata"];
type CustomProperties = Record<`--${string}`, string | number>;
type CodeViewInstance = NonNullable<
  ReturnType<CodeViewHandle<AnnotationMetadata>["getInstance"]>
>;

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

const CONTEXT_LINES = 3;
const SORTED_FILES = [...PR_FILES].sort((a, b) =>
  a.path.localeCompare(b.path, undefined, { sensitivity: "base" })
);
const FILE_PATHS = SORTED_FILES.map((f) => f.path);
const GIT_STATUS = SORTED_FILES.map((f) => ({
  path: f.path,
  status: f.status,
}));
const FILE_PATH_SET = new Set(FILE_PATHS);
const LAYOUT_PADDING = 0;
const CODE_VIEW_FILE_TREE_ITEM_HEIGHT = 24;

const CODE_VIEW_CUSTOM_CSS = `
[data-diffs-header] {
  container-type: scroll-state;
  container-name: sticky-header;
}

@container sticky-header scroll-state(stuck: top) {
  [data-diffs-header]::after {
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 1px;
    content: "";
    background-color: var(--color-border-opaque);
  }
}
`;

const FILE_TREE_STYLES: CSSProperties & CustomProperties = {
  "--trees-bg-override": "var(--diffshub-sidebar-bg)",
  "--trees-density-override": 0.8,
  "--trees-selected-fg-override": "light-dark(#1c1c1e, #f0f0f2)",
  "--trees-padding-inline-override": 8,
  "--trees-bg-muted": "light-dark(#f5f5f5, #262626)",
  "--trees-search-bg-override": "light-dark(#fff, #262626)",
  "--trees-git-renamed-color-override": "light-dark(#007aff, #007aff)",
};

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

function extractLineContext(
  content: string,
  lineNumber: number
): {
  lineContent: string;
  contextBefore: string;
  contextAfter: string;
} {
  const lines = content.split("\n");
  const index = lineNumber - 1;
  return {
    lineContent: lines[index] ?? "",
    contextBefore: lines
      .slice(Math.max(0, index - CONTEXT_LINES), index)
      .join("\n"),
    contextAfter: lines
      .slice(index + 1, Math.min(lines.length, index + 1 + CONTEXT_LINES))
      .join("\n"),
  };
}

function findBestAnnotationMatch(
  anchor: AnnotationAnchor,
  lines: string[]
): number | null {
  const contextBefore = anchor.contextBefore
    ? anchor.contextBefore.split("\n")
    : [];
  const contextAfter = anchor.contextAfter
    ? anchor.contextAfter.split("\n")
    : [];

  let bestScore = -1;
  let bestLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== anchor.lineContent) continue;

    let score = 0;
    for (let j = 0; j < contextBefore.length; j++) {
      const index = i - contextBefore.length + j;
      if (index >= 0 && lines[index] === contextBefore[j]) score++;
    }
    for (let j = 0; j < contextAfter.length; j++) {
      const index = i + 1 + j;
      if (index < lines.length && lines[index] === contextAfter[j]) score++;
    }

    const proximity = 1 / (1 + Math.abs(i + 1 - anchor.lineNumber));
    const total = score + proximity;

    if (total > bestScore) {
      bestScore = total;
      bestLine = i + 1;
    }
  }

  return bestLine;
}

function resolveAnnotation(
  anchor: AnnotationAnchor,
  oldContent: string,
  newContent: string
): ResolvedAnnotation | null {
  const newLine = findBestAnnotationMatch(anchor, newContent.split("\n"));
  if (newLine !== null) return { lineNumber: newLine, side: "additions" };

  const oldLine = findBestAnnotationMatch(anchor, oldContent.split("\n"));
  if (oldLine !== null) return { lineNumber: oldLine, side: "deletions" };

  return null;
}

function isAnnotationSide(value: string | undefined): value is AnnotationSide {
  return value === "additions" || value === "deletions";
}

function getRangeEndSide(range: SelectedLineRange): AnnotationSide | undefined {
  return range.endSide ?? range.side;
}

function getRangeLabel(range: SelectedLineRange): string {
  const startSide = range.side === "additions" ? "+" : "-";
  const endSide = getRangeEndSide(range) === "additions" ? "+" : "-";
  if (range.start === range.end && range.side === getRangeEndSide(range)) {
    return `Line ${startSide}${range.start}`;
  }
  return `Lines ${startSide}${range.start}-${endSide}${range.end}`;
}

function getThreadRange(
  metadata: ThreadMetadata,
  resolved: { lineNumber: number; side: AnnotationSide }
): SelectedLineRange {
  const storedLineNumber = metadata.lineNumber;
  const storedStart = metadata.rangeStartLineNumber ?? storedLineNumber;
  const storedEnd = metadata.rangeEndLineNumber ?? storedLineNumber;
  const offset = resolved.lineNumber - storedLineNumber;
  const side = isAnnotationSide(metadata.rangeSide)
    ? metadata.rangeSide
    : resolved.side;
  const endSide = isAnnotationSide(metadata.rangeEndSide)
    ? metadata.rangeEndSide
    : side;

  return {
    start: Math.max(1, storedStart + offset),
    end: Math.max(1, storedEnd + offset),
    side,
    endSide,
  };
}

function getInitialVisibleRowCount(): number {
  if (typeof window === "undefined") return 25;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return 25;
  return Math.min(
    96,
    Math.max(25, Math.ceil(viewportHeight / CODE_VIEW_FILE_TREE_ITEM_HEIGHT))
  );
}

export function CodeReview() {
  const { threads } = useThreads();
  const createThread = useCreateThread();
  const [pendingComposer, setPendingComposer] =
    useState<PendingComposer | null>(null);
  const [selectedLines, setSelectedLines] =
    useState<CodeViewLineSelection | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("files");
  const isWideLayout = useMediaQuery("(min-width: 768px)");
  const [initialVisibleRowCount] = useState(getInitialVisibleRowCount);

  const codeViewRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);
  const nextComposerKeyRef = useRef(0);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const fileDiffs = useMemo(
    () => SORTED_FILES.map((file) => getCachedDiff(file)),
    []
  );

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
    initialVisibleRowCount,
    itemHeight: CODE_VIEW_FILE_TREE_ITEM_HEIGHT,
    paths: FILE_PATHS,
    stickyFolders: true,
  });

  useEffect(() => {
    treeModel.resetPaths(filteredFilePaths);
  }, [treeModel, filteredFilePaths]);

  const threadsByFile = useMemo(() => {
    const map = new Map<string, ThreadData[]>();
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

  const resolvedThreads = useMemo((): ResolvedThread[] => {
    const nextResolvedThreads: ResolvedThread[] = [];

    for (const file of SORTED_FILES) {
      const fileThreads = threadsByFile.get(file.path) ?? [];
      for (const thread of fileThreads) {
        const resolved = resolveAnnotation(
          thread.metadata,
          file.oldContent,
          file.newContent
        );
        if (!resolved) continue;
        const range = getThreadRange(thread.metadata, resolved);
        const side = getRangeEndSide(range) ?? resolved.side;
        const lineNumber = range.end;
        nextResolvedThreads.push({
          id: thread.id,
          filePath: file.path,
          itemId: diffItemId(file.path),
          lineNumber,
          range,
          side,
          thread,
        });
      }
    }

    return nextResolvedThreads;
  }, [threadsByFile]);

  const items = useMemo((): CodeViewDiffItem<AnnotationMetadata>[] => {
    return SORTED_FILES.map((file, index) => {
      const fileDiff = fileDiffs[index];
      const annotations: DiffLineAnnotation<AnnotationMetadata>[] = [];

      for (const resolvedThread of resolvedThreads) {
        if (resolvedThread.filePath !== file.path) continue;
        annotations.push({
          lineNumber: resolvedThread.lineNumber,
          side: resolvedThread.side,
          metadata: {
            type: "thread",
            threadId: resolvedThread.id,
            range: resolvedThread.range,
          },
        });
      }

      if (pendingComposer?.filePath === file.path) {
        annotations.push({
          lineNumber: pendingComposer.lineNumber,
          side: pendingComposer.side,
          metadata: {
            type: "composer",
            key: pendingComposer.key,
            filePath: file.path,
            lineContent: pendingComposer.lineContent,
            contextBefore: pendingComposer.contextBefore,
            contextAfter: pendingComposer.contextAfter,
            lineNumber: pendingComposer.lineNumber,
            range: pendingComposer.range,
          },
        });
      }

      const versionStr = annotations
        .map((annotation) =>
          annotation.metadata.type === "thread"
            ? annotation.metadata.threadId
            : annotation.metadata.key
        )
        .join(",");
      let version = fileDiff.cacheKey?.length ?? 0;
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
  }, [fileDiffs, resolvedThreads, pendingComposer]);

  const diffStyle: DiffStyle = isWideLayout ? "split" : "unified";

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

  const scrollToThread = useCallback((thread: ResolvedThread) => {
    setActiveSidebarTab("comments");
    codeViewRef.current?.setSelectedLines({
      id: thread.itemId,
      range: thread.range,
    });
    codeViewRef.current?.scrollTo({
      type: "line",
      id: thread.itemId,
      lineNumber: thread.lineNumber,
      side: thread.side,
      align: "center",
      behavior: "smooth-auto",
    });
  }, []);

  const handleTreeClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      for (const target of event.nativeEvent.composedPath()) {
        if (!(target instanceof Element)) continue;
        const path = target.getAttribute("data-item-path");
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

  const createDraftComposer = useCallback(
    (range: SelectedLineRange, item: CodeViewDiffItem<AnnotationMetadata>) => {
      const side = getRangeEndSide(range);
      if (!side) return;
      const file = SORTED_FILES.find((f) => diffItemId(f.path) === item.id);
      if (!file) return;
      const content = side === "additions" ? file.newContent : file.oldContent;
      const { lineContent, contextBefore, contextAfter } = extractLineContext(
        content,
        range.end
      );
      const key = `draft-${nextComposerKeyRef.current++}`;
      setSelectedLines({ id: item.id, range });
      setPendingComposer({
        key,
        filePath: file.path,
        lineContent,
        contextBefore,
        contextAfter,
        lineNumber: range.end,
        side,
        range,
      });
    },
    []
  );

  const options = useMemo(
    (): CodeViewOptions<AnnotationMetadata> => ({
      diffIndicators: "bars",
      diffStyle,
      enableGutterUtility: true,
      enableLineSelection: true,
      hunkSeparators: "line-info-basic",
      itemMetrics: { diffHeaderHeight: 40 },
      layout: {
        gap: 1,
        paddingBottom: LAYOUT_PADDING,
        paddingTop: LAYOUT_PADDING,
      },
      lineDiffType: "char",
      lineHoverHighlight: "number",
      stickyHeaders: true,
      themeType: "system",
      unsafeCSS: CODE_VIEW_CUSTOM_CSS,
      onGutterUtilityClick(range, context) {
        if (context.item.type !== "diff") return;
        createDraftComposer(range, context.item);
      },
      onLineSelectionEnd(range) {
        if (range == null) {
          setSelectedLines(null);
        }
      },
    }),
    [createDraftComposer, diffStyle]
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

      if (metadata.type === "composer") {
        return (
          <div className="max-w-[600px] p-2">
            <Composer
              autoFocus
              onComposerSubmit={({ body }, event) => {
                event.preventDefault();
                createThread({
                  body,
                  metadata: {
                    filePath: metadata.filePath,
                    lineContent: metadata.lineContent,
                    contextBefore: metadata.contextBefore,
                    contextAfter: metadata.contextAfter,
                    lineNumber: metadata.lineNumber,
                    rangeStartLineNumber: metadata.range.start,
                    rangeEndLineNumber: metadata.range.end,
                    rangeSide: metadata.range.side,
                    rangeEndSide: metadata.range.endSide,
                  },
                });
                setPendingComposer(null);
                setSelectedLines(null);
              }}
              className="rounded-xl bg-[var(--card)] shadow-sm dark:bg-neutral-800 overflow-hidden"
            />
          </div>
        );
      }

      const thread = threads.find((t) => t.id === metadata.threadId);
      if (!thread) return null;

      return (
        <div
          className="max-w-[600px] p-2"
          onClick={() =>
            setSelectedLines({ id: item.id, range: metadata.range })
          }
        >
          <Thread
            thread={thread}
            className="rounded-xl bg-[var(--card)] shadow-sm dark:bg-neutral-800 overflow-hidden"
          />
        </div>
      );
    },
    [threads, createThread]
  );

  const toggleCollapsed = useCallback(
    (item: CodeViewItem<AnnotationMetadata>) => {
      const viewer = codeViewRef.current;
      const instance = viewer?.getInstance();
      if (!viewer || !instance) return;
      const itemTop = instance.getTopForItem(item.id);
      item.collapsed = item.collapsed !== true;
      item.version = typeof item.version === "number" ? item.version + 1 : 1;
      if (!viewer.updateItem(item)) return;
      if (itemTop != null && itemTop < instance.getScrollTop()) {
        viewer.scrollTo({ type: "item", id: item.id, align: "start" });
      }
    },
    []
  );

  const renderHeaderPrefix = useCallback(
    (item: CodeViewItem<AnnotationMetadata>) => {
      if (item.type !== "diff") return null;
      const emptyDiff =
        item.fileDiff.splitLineCount === 0 &&
        item.fileDiff.unifiedLineCount === 0;

      return (
        <button
          type="button"
          disabled={emptyDiff}
          aria-label={item.collapsed ? "Expand diff" : "Collapse diff"}
          className="ml-[-8px] inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleCollapsed(item);
          }}
        >
          <span
            className={
              item.collapsed
                ? "block rotate-[-90deg] transition-transform"
                : "block transition-transform"
            }
          >
            ▾
          </span>
        </button>
      );
    },
    [toggleCollapsed]
  );

  const renderCustomHeader = useCallback(
    (item: CodeViewItem<AnnotationMetadata>) => {
      if (item.type !== "diff") return null;
      const file = SORTED_FILES.find((f) => diffItemId(f.path) === item.id);
      if (!file) return null;
      const fileThreadCount = (threadsByFile.get(file.path) ?? []).length;

      return (
        <div className="flex h-10 items-center gap-2 px-3 text-xs">
          <span className="min-w-0 flex-1 truncate font-mono font-medium text-neutral-800 dark:text-neutral-200">
            {file.path}
          </span>
          {file.status === "added" && (
            <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              New
            </span>
          )}
          {fileThreadCount > 0 && (
            <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
              {fileThreadCount} comment{fileThreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      );
    },
    [threadsByFile]
  );

  return (
    <div className="code-review-shell grid h-screen min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--background)] text-[var(--foreground)] [grid-template-areas:'header''viewer'] md:grid-cols-[320px_minmax(0,1fr)] md:[grid-template-areas:'header_header''tree_viewer']">
      <Header />

      <aside className="contain-strict z-30 flex min-h-0 flex-col border-r border-[var(--color-border-opaque)] bg-neutral-50 pt-3 [grid-area:tree] dark:bg-neutral-900">
        <div className="flex items-center gap-3 px-4 pt-5 pb-2 md:px-3 md:pt-0.5 md:pb-0">
          <div
            className="mr-auto flex min-w-0 gap-3 bg-transparent md:gap-2"
            role="tablist"
            aria-label="Sidebar sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSidebarTab === "files"}
              className="code-review-tab-button"
              onClick={() => setActiveSidebarTab("files")}
            >
              <IconFileTree className="size-4 md:size-3" />
              <span className="sr-only">Files</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSidebarTab === "comments"}
              className="code-review-tab-button"
              onClick={() => setActiveSidebarTab("comments")}
            >
              <IconConvoFill className="size-4 md:size-3" />
              <span className="sr-only">Comments</span>
            </button>
          </div>
        </div>

        {activeSidebarTab === "files" ? (
          <>
            <div className="border-b border-[var(--color-border-opaque)] px-3 py-3">
              <input
                type="text"
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                placeholder="Filter files"
                className="h-8 w-full rounded-md border border-transparent bg-white px-2 text-xs text-[var(--foreground)] outline-none ring-1 ring-black/5 transition placeholder:text-[var(--muted-foreground)] focus:border-neutral-300 dark:bg-neutral-800 dark:ring-white/10 dark:focus:border-neutral-700"
              />
            </div>
            <div
              className="min-h-0 flex-1 overflow-hidden"
              onClick={handleTreeClick}
            >
              <FileTree
                model={treeModel}
                className="cv-mini-scrollbar h-full min-h-0 overflow-auto overscroll-contain md:ml-3"
                style={FILE_TREE_STYLES}
              />
            </div>
          </>
        ) : (
          <CommentsSidebar
            resolvedThreads={resolvedThreads}
            scrollToFile={scrollToFile}
            scrollToThread={scrollToThread}
          />
        )}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden [grid-area:viewer]">
        <CodeView
          className="relative h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain border-b border-[var(--color-border)] [overflow-anchor:none] md:border-b-0 [&_diffs-container]:overflow-clip [&_diffs-container]:[contain:layout_paint_style] [&_diffs-container]:shadow-[0_-1px_0_var(--color-border-opaque),0_1px_0_var(--color-border-opaque)]"
          ref={codeViewRef}
          items={items}
          options={options}
          selectedLines={selectedLines}
          onSelectedLinesChange={setSelectedLines}
          onScroll={handleScroll}
          renderAnnotation={renderAnnotation}
          renderCustomHeader={renderCustomHeader}
          renderHeaderPrefix={renderHeaderPrefix}
        />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="z-10 flex flex-wrap items-center gap-2.5 border-b border-[var(--color-border-opaque)] bg-[var(--background)] px-4 pt-3 pb-2 [contain:layout_paint] [grid-area:header] md:flex-nowrap md:bg-neutral-50 md:px-3 md:py-1.5 md:dark:bg-neutral-900">
      <div className="mr-auto min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md border border-[var(--color-border-opaque)] bg-white px-2 py-1 text-xs font-semibold dark:bg-neutral-800">
            Liveblocks
          </span>
          <h1 className="truncate text-sm font-semibold md:text-base">
            {PR_TITLE}
          </h1>
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Open
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[var(--foreground)]">
            {PR_BRANCH}
          </code>
          <span>into</span>
          <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[var(--foreground)]">
            {PR_BASE}
          </code>
          <span>{PR_FILES.length} files</span>
        </div>
      </div>
    </header>
  );
}

function CommentsSidebar({
  resolvedThreads,
  scrollToFile,
  scrollToThread,
}: {
  resolvedThreads: ResolvedThread[];
  scrollToFile: (path: string) => void;
  scrollToThread: (thread: ResolvedThread) => void;
}) {
  if (resolvedThreads.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-7 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <IconConvoFill size={24} className="mb-2" />
        <div className="flex flex-col">
          <strong className="font-medium text-neutral-800 dark:text-neutral-200">
            No comments yet
          </strong>
          <p>
            Hover over a line and click the{" "}
            <span className="inline-flex size-5 items-center justify-center rounded bg-[rgb(0,159,255)] align-top text-white dark:text-black">
              <IconPlus />
            </span>{" "}
            button to add code comments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cv-mini-scrollbar h-full min-h-0 overflow-auto overscroll-contain pl-3 pr-[max(0px,calc(12px-var(--cv-mini-gutter-vertical)))] pb-3">
      {SORTED_FILES.map((file) => {
        const fileThreads = resolvedThreads.filter(
          (thread) => thread.filePath === file.path
        );
        if (fileThreads.length === 0) return null;

        return (
          <section key={file.path}>
            <button
              type="button"
              className="p-3 pb-2 text-left font-mono text-sm font-medium break-all text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              onClick={() => scrollToFile(file.path)}
            >
              {file.path}
            </button>
            <div className="overflow-hidden rounded-lg border border-[rgb(0_0_0_/_0.1)] dark:border-[rgb(255_255_255_/_0.15)]">
              {fileThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className="block w-full cursor-pointer border-b border-[rgb(0_0_0_/_0.1)] bg-[var(--card)] p-3 text-left text-sm transition-colors last:border-b-0 hover:bg-[var(--muted)] dark:border-[rgb(255_255_255_/_0.15)] dark:bg-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => scrollToThread(thread)}
                >
                  <span className="text-[var(--muted-foreground)]">
                    Thread on{" "}
                    <span
                      className={
                        thread.side === "additions"
                          ? "font-medium text-emerald-700 dark:text-emerald-400"
                          : "font-medium text-rose-700 dark:text-rose-400"
                      }
                    >
                      {getRangeLabel(thread.range)}
                    </span>
                  </span>
                  <p className="mt-0.5 text-[var(--foreground)]">
                    {thread.thread.comments.length} comment
                    {thread.thread.comments.length !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
