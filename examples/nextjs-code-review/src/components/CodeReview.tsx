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
import { useUser } from "@liveblocks/react";
import { useThreads } from "@liveblocks/react/suspense";
import { Avatar, AvatarStack, Composer, Thread } from "@liveblocks/react-ui";
import {
  parsePatchFiles,
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
  IconCheck,
  IconChevronSm,
  IconConvoFill,
  IconFileTree,
  IconSearch,
  IconSidebar,
  IconX,
} from "@pierre/icons";
import { FileTree, useFileTree } from "@pierre/trees/react";
import {
  createFileTreeIconResolver,
  getBuiltInSpriteSheet,
} from "@pierre/trees";
import type { FileTreeRowDecorationRenderer } from "@pierre/trees";
import { cn } from "cnfast";
import { DIFF } from "../diff";
import type { DiffFile } from "../diff";
import { pluralize } from "../utils/pluralize";

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

interface AnchoredThread {
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

interface PendingLineScroll {
  itemId: string;
  lineNumber: number;
  side: AnnotationSide;
}

type ThreadData = ReturnType<typeof useThreads>["threads"][number];
type ThreadMetadata = ThreadData["metadata"];
type CustomProperties = Record<`--${string}`, string | number>;
type SparseLines = Array<string | undefined>;
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

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, textarea:not([disabled]), [href], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement | ShadowRoot): HTMLElement[] {
  const focusableElements: HTMLElement[] = [];

  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (
      element.matches(FOCUSABLE_SELECTOR) &&
      element.getClientRects().length > 0
    ) {
      focusableElements.push(element);
    }
    if (element.shadowRoot) {
      focusableElements.push(...getFocusableElements(element.shadowRoot));
    }
  }

  return focusableElements;
}

function getDeepActiveElement(): Element | null {
  let activeElement = document.activeElement;
  while (
    activeElement instanceof HTMLElement &&
    activeElement.shadowRoot?.activeElement
  ) {
    activeElement = activeElement.shadowRoot.activeElement;
  }
  return activeElement;
}

const CONTEXT_LINES = 3;
/**
 * Sort files the same way the FileTree component does: directories before
 * files, then alphabetically within each level (case-insensitive). This keeps
 * the code view scroll position in sync with the tree selection.
 */
function treeSort(a: DiffFile, b: DiffFile): number {
  const aParts = a.path.split("/");
  const bParts = b.path.split("/");
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aSeg = aParts[i];
    const bSeg = bParts[i];

    if (aSeg === undefined) return -1;
    if (bSeg === undefined) return 1;

    const aIsDir = i < aParts.length - 1;
    const bIsDir = i < bParts.length - 1;

    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;

    const cmp = aSeg.localeCompare(bSeg, undefined, { sensitivity: "base" });
    if (cmp !== 0) return cmp;
  }

  return 0;
}

const SORTED_FILES = [...DIFF.changes].sort(treeSort);
const FILE_PATHS = SORTED_FILES.map((f) => f.path);
const FILE_BY_ITEM_ID = new Map(
  SORTED_FILES.map((file) => [diffItemId(file.path), file])
);
const GIT_STATUS = SORTED_FILES.map((f) => ({
  path: f.path,
  status: f.status,
}));
const FILE_PATH_SET = new Set(FILE_PATHS);
const DIFF_STATS = new Map(
  SORTED_FILES.map((f) => {
    let added = 0;
    let removed = 0;
    for (const line of f.patch.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) added++;
      else if (line.startsWith("-") && !line.startsWith("---")) removed++;
    }
    return [f.path, { added, removed }] as const;
  })
);
const LAYOUT_PADDING = 0;
const CODE_VIEW_FILE_TREE_ITEM_HEIGHT = 26;

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

:host {
  interpolate-size: allow-keywords;
  transition: height 250ms ease;
  overflow: hidden;
}
`;

const FILE_TREE_CUSTOM_CSS = `
[data-file-tree-virtualized-scroll="true"] {
  box-sizing: border-box;
  padding-block: 8px;
}
`;

const FILE_TREE_STYLES: CSSProperties & CustomProperties = {
  "--trees-bg-override": "var(--diffshub-sidebar-bg)",
  "--trees-selected-fg-override": "light-dark(#1c1c1e, #f0f0f2)",
  "--trees-padding-inline-override": 8,
  "--trees-bg-muted": "light-dark(#f5f5f5, #262626)",
  "--trees-search-bg-override": "light-dark(#fff, #262626)",
  "--trees-git-renamed-color-override": "light-dark(#007aff, #007aff)",
};

const { resolveIcon: resolveFileIcon } = createFileTreeIconResolver("standard");
const FILE_TREE_SPRITE_SHEET = getBuiltInSpriteSheet("standard");

const diffCache = new Map<string, FileDiffMetadata>();

function diffItemId(path: string): string {
  return `diff:${path}`;
}

function getCachedDiff(file: {
  path: string;
  patch: string;
}): FileDiffMetadata {
  const cacheKey = `${file.path}:${file.patch.length}`;
  const cached = diffCache.get(cacheKey);
  if (cached) return cached;
  // parsePatchFiles requires a full git diff header; patches from GitHub's API
  // only include hunk content starting with @@, so we prepend the header.
  const fullPatch = `diff --git a/${file.path} b/${file.path}\n--- a/${file.path}\n+++ b/${file.path}\n${file.patch}`;
  const diff = parsePatchFiles(fullPatch, cacheKey)[0]?.files[0];
  if (!diff) {
    throw new Error(`Could not parse the diff for ${file.path}`);
  }
  diffCache.set(cacheKey, diff);
  return diff;
}

/**
 * Reconstruct a sparse line array (1-indexed) from a unified diff patch
 * string. Only lines visible in the diff (changed + context) are present.
 * Used for annotation anchor matching — annotations are always placed on
 * visible diff lines, so this gives us sufficient coverage.
 */
function linesFromPatch(
  patch: string,
  side: "additions" | "deletions"
): SparseLines {
  const lines: SparseLines = [];
  let lineNum = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match =
        side === "additions" ? raw.match(/\+(\d+)/) : raw.match(/-(\d+)/);
      lineNum = match ? parseInt(match[1], 10) : 1;
      continue;
    }
    if (side === "additions") {
      if (raw.startsWith("+")) {
        lines[lineNum - 1] = raw.slice(1);
        lineNum++;
      } else if (raw.startsWith(" ")) {
        lines[lineNum - 1] = raw.slice(1);
        lineNum++;
      }
    } else {
      if (raw.startsWith("-")) {
        lines[lineNum - 1] = raw.slice(1);
        lineNum++;
      } else if (raw.startsWith(" ")) {
        lines[lineNum - 1] = raw.slice(1);
        lineNum++;
      }
    }
  }
  return lines;
}

function extractLineContext(
  lines: SparseLines,
  lineNumber: number
): {
  lineContent: string;
  contextBefore: string;
  contextAfter: string;
} {
  const index = lineNumber - 1;
  return {
    lineContent: lines[index] ?? "",
    contextBefore: lines
      .slice(Math.max(0, index - CONTEXT_LINES), index)
      .filter((line): line is string => line !== undefined)
      .join("\n"),
    contextAfter: lines
      .slice(index + 1, Math.min(lines.length, index + 1 + CONTEXT_LINES))
      .filter((line): line is string => line !== undefined)
      .join("\n"),
  };
}

function findBestAnnotationMatch(
  anchor: AnnotationAnchor,
  lines: SparseLines
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
  patch: string,
  preferredSide?: AnnotationSide
): ResolvedAnnotation | null {
  const sides: AnnotationSide[] =
    preferredSide === "deletions"
      ? ["deletions", "additions"]
      : ["additions", "deletions"];

  for (const side of sides) {
    const lineNumber = findBestAnnotationMatch(
      anchor,
      linesFromPatch(patch, side)
    );
    if (lineNumber !== null) return { lineNumber, side };
  }

  return null;
}

function isAnnotationSide(value: string | undefined): value is AnnotationSide {
  return value === "additions" || value === "deletions";
}

function getRangeEndSide(range: SelectedLineRange): AnnotationSide | undefined {
  return range.endSide ?? range.side;
}

function getRangeLabel(range: SelectedLineRange): string {
  const endSide = getRangeEndSide(range);
  if (range.side === endSide && range.side) {
    const change = range.side === "additions" ? "Added" : "Deleted";
    return range.start === range.end
      ? `${change} line ${range.start}`
      : `${change} lines ${range.start}–${range.end}`;
  }

  const startPrefix = range.side === "additions" ? "+" : "-";
  const endPrefix = endSide === "additions" ? "+" : "-";
  return `Lines ${startPrefix}${range.start} to ${endPrefix}${range.end}`;
}

function normalizeSelectedLineRange(
  range: SelectedLineRange,
  getLinePosition: (
    lineNumber: number,
    side?: AnnotationSide
  ) => { top: number } | undefined
): SelectedLineRange {
  const startSide = range.side;
  const endSide = getRangeEndSide(range);
  const startPosition = getLinePosition(range.start, startSide);
  const endPosition = getLinePosition(range.end, endSide);

  if (!startPosition || !endPosition) return range;

  const startComesAfterEnd =
    startPosition.top > endPosition.top ||
    (startPosition.top === endPosition.top &&
      startSide === "additions" &&
      endSide === "deletions");
  if (!startComesAfterEnd) return range;

  const normalizedRange: SelectedLineRange = {
    start: range.end,
    end: range.start,
  };
  if (endSide) normalizedRange.side = endSide;
  if (startSide && startSide !== endSide) {
    normalizedRange.endSide = startSide;
  }
  return normalizedRange;
}

function getVisibleCommentCount(thread: ThreadData): number {
  return thread.comments.reduce(
    (count, comment) => count + (comment.deletedAt ? 0 : 1),
    0
  );
}

function getFirstVisibleComment(thread: ThreadData) {
  return thread.comments.find((comment) => !comment.deletedAt);
}

function getCommentPreview(thread: ThreadData): string {
  const body = getFirstVisibleComment(thread)?.body;
  if (!body) return "Attachment";

  const preview = body.content
    .flatMap((paragraph) =>
      paragraph.children.map((element) => {
        if (element.type === "link") return element.text ?? element.url;
        if (element.type === "mention") return `@${element.id}`;
        return element.text;
      })
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return preview || "Comment";
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

  const range: SelectedLineRange = {
    start: Math.max(1, storedStart + offset),
    end: Math.max(1, storedEnd + offset),
    side,
    endSide,
  };
  if (range.side === range.endSide && range.start > range.end) {
    return { ...range, start: range.end, end: range.start };
  }
  return range;
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
  const [pendingComposer, setPendingComposer] =
    useState<PendingComposer | null>(null);
  const [pendingLineScroll, setPendingLineScroll] =
    useState<PendingLineScroll | null>(null);
  const [selectedLines, setSelectedLines] =
    useState<CodeViewLineSelection | null>(null);
  const [collapsedItems, setCollapsedItems] = useState(() => new Set<string>());
  const [expandedResolvedThreadIds, setExpandedResolvedThreadIds] = useState(
    () => new Set<string>()
  );
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("files");
  const useSplitDiff = useMediaQuery("(min-width: 1200px)");
  const isDesktopSidebar = useMediaQuery("(min-width: 768px)");
  const [initialVisibleRowCount] = useState(getInitialVisibleRowCount);

  const reviewShellRef = useRef<HTMLDivElement>(null);
  const codeViewRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);
  const codeViewContainerRef = useRef<HTMLDivElement>(null);
  const draftComposerRef = useRef<HTMLDivElement>(null);
  const fileSearchInputRef = useRef<HTMLInputElement>(null);
  const focusPendingComposerRef = useRef(false);
  const sidebarCloseButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
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
        ? FILE_PATHS.filter((path) =>
            path.toLowerCase().includes(fileSearchQuery.toLowerCase())
          )
        : FILE_PATHS,
    [fileSearchQuery]
  );

  useEffect(() => {
    if (document.querySelector("[data-pierre-trees-sprite]")) return;
    const container = document.createElement("div");
    container.setAttribute("data-pierre-trees-sprite", "");
    container.style.display = "none";
    container.innerHTML = FILE_TREE_SPRITE_SHEET;
    document.body.insertAdjacentElement("afterbegin", container);
  }, []);

  useEffect(() => {
    if (activeSidebarTab !== "files") return;

    const reviewShell = reviewShellRef.current;
    const fileTree = reviewShell?.querySelector<HTMLElement>(
      "file-tree-container"
    );
    if (!reviewShell || !fileTree) return;

    // Trees defines its built-in palette inside a shadow root, so expose the
    // resolved file icon colors to the sibling CodeView sticky headers.
    const fileTreeStyles = getComputedStyle(fileTree);
    for (let index = 0; index < fileTreeStyles.length; index++) {
      const propertyName = fileTreeStyles.item(index);
      if (!propertyName.startsWith("--trees-file-icon-color")) continue;
      reviewShell.style.setProperty(
        propertyName,
        fileTreeStyles.getPropertyValue(propertyName)
      );
    }
  }, [activeSidebarTab]);

  useEffect(() => {
    const container = codeViewContainerRef.current;
    if (!container) return;

    const observedRoots = new WeakSet<Node>();
    const observers: MutationObserver[] = [];

    function scanRoot(root: HTMLElement | ShadowRoot): void {
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "button[data-utility-button]"
      )) {
        button.setAttribute("aria-label", "Add comment");
        button.setAttribute("title", "Add comment");
      }

      for (const element of root.querySelectorAll<HTMLElement>("*")) {
        if (element.shadowRoot) observeRoot(element.shadowRoot);
      }
    }

    function observeRoot(root: HTMLElement | ShadowRoot): void {
      if (observedRoots.has(root)) return;
      observedRoots.add(root);
      const observer = new MutationObserver(() => scanRoot(root));
      observer.observe(root, { childList: true, subtree: true });
      observers.push(observer);
      scanRoot(root);
    }

    observeRoot(container);
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

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

  const threadsById = useMemo(
    () => new Map(threads.map((thread) => [thread.id, thread])),
    [threads]
  );

  const commentCountByFile = useMemo(() => {
    const map = new Map<string, number>();
    for (const [path, fileThreads] of threadsByFile) {
      let count = 0;
      for (const thread of fileThreads) {
        count += getVisibleCommentCount(thread);
      }
      if (count > 0) map.set(path, count);
    }
    return map;
  }, [threadsByFile]);

  const commentCountByFileRef = useRef(commentCountByFile);
  commentCountByFileRef.current = commentCountByFile;

  const renderRowDecoration = useCallback<FileTreeRowDecorationRenderer>(
    (context) => {
      if (context.item.kind !== "file") return null;
      const count = commentCountByFileRef.current.get(context.item.path) ?? 0;
      if (count === 0) return null;
      const label = `${count} ${pluralize(count, "comment")}`;
      return { text: String(count), title: label };
    },
    []
  );

  const { model: treeModel } = useFileTree({
    flattenEmptyDirectories: true,
    gitStatus: GIT_STATUS,
    initialExpansion: "open",
    initialVisibleRowCount,
    itemHeight: CODE_VIEW_FILE_TREE_ITEM_HEIGHT,
    paths: FILE_PATHS,
    renderRowDecoration,
    stickyFolders: true,
    unsafeCSS: FILE_TREE_CUSTOM_CSS,
  });

  useEffect(() => {
    if (!isFileSearchOpen) return;
    fileSearchInputRef.current?.focus();
  }, [isFileSearchOpen]);

  useEffect(() => {
    treeModel.resetPaths(filteredFilePaths);
  }, [filteredFilePaths, treeModel]);

  useEffect(() => {
    if (!isSidebarOpen || isDesktopSidebar) return;
    sidebarCloseButtonRef.current?.focus();
    return () => sidebarTriggerRef.current?.focus();
  }, [isDesktopSidebar, isSidebarOpen]);

  useEffect(() => {
    treeModel.setGitStatus([...GIT_STATUS]);
  }, [treeModel, commentCountByFile]);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const handleSidebarKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
        return;
      }
      if (event.key !== "Tab" || isDesktopSidebar) return;

      const focusableElements = getFocusableElements(event.currentTarget);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) return;
      const activeElement = getDeepActiveElement();

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [closeSidebar, isDesktopSidebar]
  );

  const anchoredThreads = useMemo((): AnchoredThread[] => {
    const nextAnchoredThreads: AnchoredThread[] = [];

    for (const file of SORTED_FILES) {
      const fileThreads = threadsByFile.get(file.path) ?? [];
      for (const thread of fileThreads) {
        if (getVisibleCommentCount(thread) === 0) continue;
        const preferredSide = isAnnotationSide(thread.metadata.rangeEndSide)
          ? thread.metadata.rangeEndSide
          : isAnnotationSide(thread.metadata.rangeSide)
            ? thread.metadata.rangeSide
            : undefined;
        const resolved = resolveAnnotation(
          thread.metadata,
          file.patch,
          preferredSide
        );
        if (!resolved) continue;
        const range = getThreadRange(thread.metadata, resolved);
        const side = getRangeEndSide(range) ?? resolved.side;
        const lineNumber = range.end;
        nextAnchoredThreads.push({
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

    return nextAnchoredThreads;
  }, [threadsByFile]);

  const items = useMemo((): CodeViewDiffItem<AnnotationMetadata>[] => {
    return SORTED_FILES.map((file, index) => {
      const fileDiff = fileDiffs[index];
      const annotations: DiffLineAnnotation<AnnotationMetadata>[] = [];

      for (const anchoredThread of anchoredThreads) {
        if (anchoredThread.filePath !== file.path) continue;
        annotations.push({
          lineNumber: anchoredThread.lineNumber,
          side: anchoredThread.side,
          metadata: {
            type: "thread",
            threadId: anchoredThread.id,
            range: anchoredThread.range,
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
      const isCollapsed = collapsedItems.has(diffItemId(file.path));
      let version = fileDiff.cacheKey?.length ?? 0;
      if (isCollapsed) version = (version * 31 + 1) >>> 0;
      for (let i = 0; i < versionStr.length; i++) {
        version = (version * 31 + versionStr.charCodeAt(i)) >>> 0;
      }

      return {
        id: diffItemId(file.path),
        type: "diff",
        fileDiff,
        annotations,
        version,
        collapsed: isCollapsed,
      };
    });
  }, [fileDiffs, anchoredThreads, pendingComposer, collapsedItems]);

  const diffStyle: DiffStyle = useSplitDiff ? "split" : "unified";

  useEffect(() => {
    if (!pendingLineScroll) return;

    let scrollFrame = 0;
    const renderFrame = requestAnimationFrame(() => {
      scrollFrame = requestAnimationFrame(() => {
        codeViewRef.current?.scrollTo({
          type: "line",
          id: pendingLineScroll.itemId,
          lineNumber: pendingLineScroll.lineNumber,
          side: pendingLineScroll.side,
          align: "center",
          behavior: "smooth-auto",
        });
        if (focusPendingComposerRef.current) {
          focusPendingComposerRef.current = false;
          draftComposerRef.current
            ?.querySelector<HTMLElement>('[contenteditable="true"]')
            ?.focus({ preventScroll: true });
        }
        setPendingLineScroll(null);
      });
    });

    return () => {
      cancelAnimationFrame(renderFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, [items, pendingLineScroll]);

  const prepareForNavigation = useCallback(() => {
    if (!pendingComposer) return true;
    if (window.confirm("Discard your unfinished comment and navigate away?")) {
      setPendingComposer(null);
      setSelectedLines(null);
      return true;
    }

    const itemId = diffItemId(pendingComposer.filePath);
    closeSidebar();
    setCollapsedItems((collapsed) => {
      if (!collapsed.has(itemId)) return collapsed;
      const next = new Set(collapsed);
      next.delete(itemId);
      return next;
    });
    setSelectedLines({ id: itemId, range: pendingComposer.range });
    focusPendingComposerRef.current = true;
    setPendingLineScroll({
      itemId,
      lineNumber: pendingComposer.lineNumber,
      side: pendingComposer.side,
    });
    return false;
  }, [closeSidebar, pendingComposer]);

  const scrollToFile = useCallback(
    (path: string) => {
      if (!prepareForNavigation()) return;
      closeSidebar();
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
    },
    [closeSidebar, prepareForNavigation]
  );

  const scrollToThread = useCallback(
    (thread: AnchoredThread) => {
      if (!prepareForNavigation()) return;
      closeSidebar();
      setActiveSidebarTab("comments");
      setCollapsedItems((collapsed) => {
        if (!collapsed.has(thread.itemId)) return collapsed;
        const next = new Set(collapsed);
        next.delete(thread.itemId);
        return next;
      });
      if (thread.thread.resolved) {
        setExpandedResolvedThreadIds((expanded) => {
          if (expanded.has(thread.id)) return expanded;
          const next = new Set(expanded);
          next.add(thread.id);
          return next;
        });
      }
      setSelectedLines({ id: thread.itemId, range: thread.range });
      setPendingLineScroll({
        itemId: thread.itemId,
        lineNumber: thread.lineNumber,
        side: thread.side,
      });
    },
    [closeSidebar, prepareForNavigation]
  );

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
      if (pendingComposer) return;
      const side = getRangeEndSide(range);
      if (!side) return;
      const file = FILE_BY_ITEM_ID.get(item.id);
      if (!file) return;
      const lines = linesFromPatch(file.patch, side);
      const { lineContent, contextBefore, contextAfter } = extractLineContext(
        lines,
        range.end
      );
      const key = `draft-${nextComposerKeyRef.current++}`;
      setCollapsedItems((collapsed) => {
        if (!collapsed.has(item.id)) return collapsed;
        const next = new Set(collapsed);
        next.delete(item.id);
        return next;
      });
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
    [pendingComposer]
  );

  const options = useMemo(
    (): CodeViewOptions<AnnotationMetadata> => ({
      diffIndicators: "bars",
      diffStyle,
      enableGutterUtility: !pendingComposer,
      enableLineSelection: !pendingComposer,
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
        if (context.type !== "diff") return;
        const normalizedRange = normalizeSelectedLineRange(
          range,
          context.instance.getLinePosition.bind(context.instance)
        );
        createDraftComposer(normalizedRange, context.item);
      },
      onLineSelectionEnd(range, context) {
        if (!range || pendingComposer || context.type !== "diff") return;
        const normalizedRange = normalizeSelectedLineRange(
          range,
          context.instance.getLinePosition.bind(context.instance)
        );
        setSelectedLines({ id: context.item.id, range: normalizedRange });
      },
    }),
    [createDraftComposer, diffStyle, pendingComposer]
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
          <div
            ref={draftComposerRef}
            className="max-w-[620px] p-2 font-sans text-base"
          >
            <div className="code-review-draft overflow-hidden rounded-lg border border-blue-500/30 bg-(--card) shadow-[0_8px_24px_rgb(0_0_0/0.12)] dark:border-blue-400/30">
              <div className="flex h-8 items-center gap-2 border-b border-(--color-border-opaque) px-3 text-xs text-(--muted-foreground)">
                <span className="truncate">
                  {getRangeLabel(metadata.range)}
                </span>
                <button
                  type="button"
                  aria-label="Cancel comment"
                  title="Cancel comment"
                  className="-mr-1 ml-auto inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-(--muted) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-blue-500"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingComposer(null);
                    setSelectedLines(null);
                  }}
                >
                  <IconX className="size-3.5" />
                </button>
              </div>
              <Composer
                autoFocus
                metadata={{
                  filePath: metadata.filePath,
                  lineContent: metadata.lineContent,
                  contextBefore: metadata.contextBefore,
                  contextAfter: metadata.contextAfter,
                  lineNumber: metadata.lineNumber,
                  rangeStartLineNumber: metadata.range.start,
                  rangeEndLineNumber: metadata.range.end,
                  rangeSide: metadata.range.side,
                  rangeEndSide: metadata.range.endSide,
                }}
                onComposerSubmit={() => {
                  setPendingComposer(null);
                  setSelectedLines(null);
                }}
                className="rounded-none bg-(--card)"
              />
            </div>
          </div>
        );
      }

      const thread = threadsById.get(metadata.threadId);
      if (!thread) return null;

      const isExpanded =
        !thread.resolved || expandedResolvedThreadIds.has(thread.id);
      const commentCount = getVisibleCommentCount(thread);

      return (
        <div
          className="max-w-[620px] p-2 font-sans text-base"
          onClick={() =>
            setSelectedLines({ id: item.id, range: metadata.range })
          }
        >
          <div className="overflow-hidden rounded-lg border border-(--color-border-opaque) bg-(--card) dark:bg-neutral-800">
            {thread.resolved && (
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`thread-${thread.id}`}
                className={cn(
                  "flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-xs text-neutral-500 transition-colors select-none hover:bg-(--muted) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 dark:text-neutral-400",
                  isExpanded && "border-b border-(--color-border-opaque)"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedResolvedThreadIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(thread.id)) next.delete(thread.id);
                    else next.add(thread.id);
                    return next;
                  });
                }}
              >
                <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <IconCheck className="size-2.5" aria-hidden />
                </span>
                <span className="shrink-0 font-medium text-(--foreground)">
                  Resolved
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {getCommentPreview(thread)}
                </span>
                <span className="shrink-0 tabular-nums">
                  {commentCount} {pluralize(commentCount, "comment")}
                </span>
                <IconChevronSm
                  aria-hidden
                  className={cn(
                    "shrink-0 text-neutral-400 transition-transform duration-150",
                    !isExpanded && "-rotate-90"
                  )}
                />
              </button>
            )}
            {isExpanded && (
              <Thread
                id={`thread-${thread.id}`}
                thread={thread}
                showComposer={thread.resolved ? false : "collapsed"}
                showSubscription={false}
                showReactions={!thread.resolved}
                maxVisibleComments={{ max: 3, show: "newest" }}
                className="code-review-thread bg-(--card)"
              />
            )}
          </div>
        </div>
      );
    },
    [threadsById, expandedResolvedThreadIds]
  );

  const toggleCollapsed = useCallback(
    (item: CodeViewItem<AnnotationMetadata>) => {
      const instance = codeViewRef.current?.getInstance();
      const itemTop = instance?.getTopForItem(item.id);
      const scrollTop = instance?.getScrollTop();
      setCollapsedItems((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      if (itemTop != null && scrollTop != null && itemTop < scrollTop) {
        codeViewRef.current?.scrollTo({
          type: "item",
          id: item.id,
          align: "start",
        });
      }
    },
    []
  );

  const renderCustomHeader = useCallback(
    (item: CodeViewItem<AnnotationMetadata>) => {
      if (item.type !== "diff") return null;
      const file = FILE_BY_ITEM_ID.get(item.id);
      if (!file) return null;
      const emptyDiff =
        item.fileDiff.splitLineCount === 0 &&
        item.fileDiff.unifiedLineCount === 0;
      const commentCount = commentCountByFile.get(file.path) ?? 0;
      const stats = DIFF_STATS.get(file.path) ?? { added: 0, removed: 0 };
      const lastSlash = file.path.lastIndexOf("/");
      const fileName =
        lastSlash === -1 ? file.path : file.path.slice(lastSlash + 1);
      const dirPath = lastSlash === -1 ? "" : file.path.slice(0, lastSlash + 1);
      const fileIcon = resolveFileIcon("file-tree-icon-file", file.path);
      const fileIconColor =
        fileIcon.token != null
          ? `var(--trees-file-icon-color-${fileIcon.token}, var(--trees-file-icon-color))`
          : undefined;

      return (
        <div className="flex h-10 min-w-0 flex-1 items-center">
          <button
            type="button"
            disabled={emptyDiff}
            aria-expanded={!item.collapsed}
            aria-label={`${item.collapsed ? "Expand" : "Collapse"} ${file.path}`}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 text-left select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-default"
            onClick={() => toggleCollapsed(item)}
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden
              className={cn(
                "shrink-0 text-neutral-400 transition-transform duration-150 dark:text-neutral-500",
                item.collapsed && "-rotate-90",
                emptyDiff && "opacity-40"
              )}
            >
              <use href="#file-tree-icon-chevron" />
            </svg>
            <svg
              viewBox={`0 0 ${fileIcon.width ?? 16} ${fileIcon.height ?? 16}`}
              width="16"
              height="16"
              aria-hidden
              style={{ color: fileIconColor, flexShrink: 0 }}
            >
              <use href={`#${fileIcon.name}`} />
            </svg>
            <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
              <span className="shrink-0 font-medium text-neutral-800 dark:text-neutral-200">
                {fileName}
              </span>
              {dirPath && (
                <span className="min-w-0 truncate text-neutral-400 dark:text-neutral-500">
                  {dirPath}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
              {(stats.added > 0 || stats.removed > 0) && (
                <span className="flex gap-1.5">
                  {stats.added > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{stats.added}
                    </span>
                  )}
                  {stats.removed > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      -{stats.removed}
                    </span>
                  )}
                </span>
              )}
              {commentCount > 0 && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  {commentCount} {pluralize(commentCount, "comment")}
                </span>
              )}
            </div>
          </button>
        </div>
      );
    },
    [commentCountByFile, toggleCollapsed]
  );

  const visibleCommentCount = anchoredThreads.reduce(
    (count, thread) => count + getVisibleCommentCount(thread.thread),
    0
  );

  return (
    <div
      ref={reviewShellRef}
      className="code-review-shell relative grid h-dvh min-h-0 grid-cols-1 grid-rows-[48px_minmax(0,1fr)] overflow-hidden bg-(--background) text-(--foreground) [grid-template-areas:'header''viewer'] md:grid-cols-[300px_minmax(0,1fr)] md:[grid-template-areas:'header_header''tree_viewer']"
    >
      <Header
        isSidebarOpen={isSidebarOpen}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        sidebarTriggerRef={sidebarTriggerRef}
      />

      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-12 bottom-0 z-20 bg-black/25 backdrop-blur-[1px] transition-opacity md:hidden",
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeSidebar}
      />

      <aside
        id="review-sidebar"
        aria-label="Review navigation"
        aria-hidden={!isDesktopSidebar && !isSidebarOpen}
        aria-modal={!isDesktopSidebar ? true : undefined}
        inert={!isDesktopSidebar && !isSidebarOpen}
        role={!isDesktopSidebar ? "dialog" : undefined}
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex h-[min(72dvh,640px)] min-h-0 flex-col overflow-hidden rounded-t-xl border-t border-(--color-border-opaque) bg-neutral-50 shadow-[0_-16px_40px_rgb(0_0_0/0.16)] transition-transform duration-200 [grid-area:tree] md:static md:h-auto md:translate-y-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none dark:bg-neutral-900",
          isSidebarOpen
            ? "translate-y-0"
            : "pointer-events-none translate-y-full md:pointer-events-auto"
        )}
        onKeyDown={handleSidebarKeyDown}
      >
        <div className="flex h-[41px] shrink-0 items-stretch border-b border-(--color-border-opaque) px-2">
          <div
            className="mr-auto flex min-w-0 items-stretch gap-1 bg-transparent"
            role="group"
            aria-label="Sidebar view"
          >
            <button
              type="button"
              aria-pressed={activeSidebarTab === "files"}
              className="code-review-tab-button"
              onClick={() => setActiveSidebarTab("files")}
            >
              <IconFileTree className="size-3.5" />
              <span>Files</span>
            </button>
            <button
              type="button"
              aria-pressed={activeSidebarTab === "comments"}
              className="code-review-tab-button"
              onClick={() => setActiveSidebarTab("comments")}
            >
              <IconConvoFill className="size-3.5" />
              <span>Comments</span>
              {visibleCommentCount > 0 && (
                <span className="code-review-tab-count">
                  {visibleCommentCount}
                </span>
              )}
            </button>
          </div>
          {activeSidebarTab === "files" && (
            <button
              type="button"
              aria-label={
                isFileSearchOpen ? "Close file search" : "Search files"
              }
              aria-controls="file-filter-region"
              aria-expanded={isFileSearchOpen}
              title={isFileSearchOpen ? "Close search" : "Search files"}
              className="my-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:bg-(--muted) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-blue-500"
              onClick={() => {
                setIsFileSearchOpen((isOpen) => {
                  if (isOpen) setFileSearchQuery("");
                  return !isOpen;
                });
              }}
            >
              <IconSearch className="size-3.5" />
            </button>
          )}
          <button
            ref={sidebarCloseButtonRef}
            type="button"
            aria-label="Close review navigation"
            className="my-auto ml-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:bg-(--muted) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-blue-500 md:hidden"
            onClick={closeSidebar}
          >
            <IconX className="size-3.5" />
          </button>
        </div>

        {activeSidebarTab === "files" ? (
          <>
            {isFileSearchOpen && (
              <div
                id="file-filter-region"
                className="flex h-10 shrink-0 items-center gap-1.5 border-b border-(--color-border-opaque) px-2"
              >
                <IconSearch className="size-3.5 shrink-0 text-(--muted-foreground)" />
                <label htmlFor="file-filter" className="sr-only">
                  Filter changed files
                </label>
                <input
                  ref={fileSearchInputRef}
                  id="file-filter"
                  type="search"
                  value={fileSearchQuery}
                  onChange={(event) => setFileSearchQuery(event.target.value)}
                  placeholder="Filter changed files"
                  className="h-7 min-w-0 flex-1 bg-transparent text-xs text-(--foreground) outline-none placeholder:text-(--muted-foreground)"
                />
                {fileSearchQuery && (
                  <button
                    type="button"
                    aria-label="Clear file search"
                    className="inline-flex size-6 cursor-pointer items-center justify-center rounded text-(--muted-foreground) hover:bg-(--muted) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-blue-500"
                    onClick={() => setFileSearchQuery("")}
                  >
                    <IconX className="size-3" />
                  </button>
                )}
              </div>
            )}
            {filteredFilePaths.length > 0 ? (
              <div
                className="min-h-0 flex-1 overflow-hidden"
                onClick={handleTreeClick}
              >
                <FileTree
                  model={treeModel}
                  className="cv-mini-scrollbar h-full min-h-0 overflow-auto overscroll-contain"
                  style={FILE_TREE_STYLES}
                />
              </div>
            ) : (
              <div
                className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-(--muted-foreground)"
                role="status"
              >
                <p className="wrap-break-word">
                  No files match <strong>“{fileSearchQuery}”</strong>.
                </p>
                <button
                  type="button"
                  className="rounded-md border border-(--color-border-opaque) bg-(--card) px-2.5 py-1.5 text-xs font-medium text-(--foreground) transition-colors hover:bg-(--muted) focus-visible:outline-2 focus-visible:outline-blue-500"
                  onClick={() => setFileSearchQuery("")}
                >
                  Clear filter
                </button>
              </div>
            )}
          </>
        ) : (
          <CommentsSidebar
            anchoredThreads={anchoredThreads}
            scrollToFile={scrollToFile}
            scrollToThread={scrollToThread}
          />
        )}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden [grid-area:viewer]">
        <CodeView
          className="relative h-full min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain border-b border-(--color-border) [overflow-anchor:none] md:border-b-0 [&_diffs-container]:overflow-clip [&_diffs-container]:shadow-[0_-1px_0_var(--color-border-opaque),0_1px_0_var(--color-border-opaque)] [&_diffs-container]:contain-[layout_paint_style]"
          containerRef={codeViewContainerRef}
          ref={codeViewRef}
          items={items}
          options={options}
          selectedLines={selectedLines}
          onSelectedLinesChange={(selection) => {
            if (!pendingComposer) setSelectedLines(selection);
          }}
          onScroll={handleScroll}
          renderAnnotation={renderAnnotation}
          renderCustomHeader={renderCustomHeader}
        />
      </main>
    </div>
  );
}

function Header({
  isSidebarOpen,
  onOpenSidebar,
  sidebarTriggerRef,
}: {
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  sidebarTriggerRef: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <header className="z-40 flex h-12 min-w-0 items-center gap-3 border-b border-(--color-border-opaque) bg-neutral-50 px-3 contain-[layout_paint] [grid-area:header] dark:bg-neutral-900">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="shrink-0 text-sm font-semibold tracking-[-0.02em]">
          Code review
        </span>
        <span className="hidden h-4 w-px shrink-0 bg-(--color-border-opaque) sm:block" />
        <h1 className="min-w-0 truncate text-sm font-medium" title={DIFF.title}>
          {DIFF.title}
        </h1>
        <span className="hidden min-w-0 truncate text-xs text-(--muted-foreground) lg:inline">
          <code>{DIFF.from}</code>
          <span className="px-1.5">→</span>
          <code>{DIFF.to}</code>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AvatarStack max={4} size={22} />
        <button
          ref={sidebarTriggerRef}
          type="button"
          aria-label="Open review navigation"
          aria-controls="review-sidebar"
          aria-expanded={isSidebarOpen}
          title="Review navigation"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:bg-(--muted) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-blue-500 md:hidden"
          onClick={onOpenSidebar}
        >
          <IconSidebar className="size-4" />
        </button>
      </div>
    </header>
  );
}

function CommentsSidebar({
  anchoredThreads,
  scrollToFile,
  scrollToThread,
}: {
  anchoredThreads: AnchoredThread[];
  scrollToFile: (path: string) => void;
  scrollToThread: (thread: AnchoredThread) => void;
}) {
  const activeThreads = anchoredThreads.filter(
    (thread) => !thread.thread.resolved
  );
  const resolvedThreads = anchoredThreads.filter(
    (thread) => thread.thread.resolved
  );

  if (anchoredThreads.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-7 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <IconConvoFill size={24} className="mb-2" />
        <div className="flex flex-col">
          <strong className="font-medium text-neutral-800 dark:text-neutral-200">
            No comments yet
          </strong>
          <p className="mt-1 text-xs leading-5">
            Hover a line number and click the blue plus. Drag line numbers first
            to comment on a range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cv-mini-scrollbar h-full min-h-0 overflow-auto overscroll-contain pb-3">
      {activeThreads.length > 0 ? (
        <SidebarThreadGroups
          anchoredThreads={activeThreads}
          scrollToFile={scrollToFile}
          scrollToThread={scrollToThread}
        />
      ) : resolvedThreads.length === 0 ? (
        <p className="border-b border-(--color-border-opaque) px-3 py-4 text-xs text-(--muted-foreground)">
          No open conversations.
        </p>
      ) : null}

      {resolvedThreads.length > 0 && (
        <details className="group border-b border-(--color-border-opaque)">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 px-3 text-xs font-medium text-(--muted-foreground) transition-colors select-none hover:bg-(--muted) hover:text-(--foreground) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <IconCheck className="size-2.5" />
            </span>
            <span>Resolved</span>
            <span className="rounded-full bg-(--muted) px-1.5 py-0.5 text-[10px] text-(--muted-foreground) tabular-nums">
              {resolvedThreads.length}
            </span>
            <IconChevronSm className="ml-auto size-3 text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <SidebarThreadGroups
            anchoredThreads={resolvedThreads}
            scrollToFile={scrollToFile}
            scrollToThread={scrollToThread}
          />
        </details>
      )}
    </div>
  );
}

function SidebarThreadGroups({
  anchoredThreads,
  scrollToFile,
  scrollToThread,
}: {
  anchoredThreads: AnchoredThread[];
  scrollToFile: (path: string) => void;
  scrollToThread: (thread: AnchoredThread) => void;
}) {
  return (
    <>
      {SORTED_FILES.map((file) => {
        const fileThreads = anchoredThreads.filter(
          (thread) => thread.filePath === file.path
        );
        if (fileThreads.length === 0) return null;

        return (
          <section
            key={file.path}
            className="border-[var(--color -border-opaque)] border-b last:border-b-0"
          >
            <button
              type="button"
              title={file.path}
              className="block w-full truncate px-3 pt-2.5 pb-1.5 text-left text-[11px] font-medium text-(--muted-foreground) transition hover:text-(--foreground) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => scrollToFile(file.path)}
            >
              {file.path}
            </button>
            <div>
              {fileThreads.map((thread) => (
                <SidebarThreadRow
                  key={thread.id}
                  anchoredThread={thread}
                  onClick={() => scrollToThread(thread)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function SidebarThreadRow({
  anchoredThread,
  onClick,
}: {
  anchoredThread: AnchoredThread;
  onClick: () => void;
}) {
  const comment = getFirstVisibleComment(anchoredThread.thread);
  if (!comment) return null;

  return (
    <SidebarThreadRowContent
      anchoredThread={anchoredThread}
      userId={comment.userId}
      onClick={onClick}
    />
  );
}

function SidebarThreadRowContent({
  anchoredThread,
  userId,
  onClick,
}: {
  anchoredThread: AnchoredThread;
  userId: string;
  onClick: () => void;
}) {
  const { user } = useUser(userId);
  const name = user?.name ?? userId;
  const commentCount = getVisibleCommentCount(anchoredThread.thread);

  return (
    <button
      type="button"
      className="grid w-full cursor-pointer grid-cols-[20px_minmax(0,1fr)] gap-2 px-3 py-2 text-left transition-colors hover:bg-(--muted) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500"
      onClick={onClick}
    >
      <Avatar
        aria-hidden
        src={user?.avatar}
        name={name}
        className="size-5 shrink-0"
      />
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1.5 text-[11px]">
          <span className="min-w-0 truncate font-medium text-(--foreground)">
            {name}
          </span>
          <span
            className={cn(
              "shrink-0",
              anchoredThread.side === "additions"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400"
            )}
          >
            {getRangeLabel(anchoredThread.range)}
          </span>
          {commentCount > 1 && (
            <span className="ml-auto shrink-0 text-(--muted-foreground) tabular-nums">
              +{commentCount - 1}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-(--muted-foreground)">
          {getCommentPreview(anchoredThread.thread)}
        </span>
      </span>
    </button>
  );
}
