"use client";

import { parsePatchFiles, type FileDiffMetadata } from "@pierre/diffs";
import { FileDiff, type FileDiffOptions } from "@pierre/diffs/react";
import clsx from "clsx";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestIcon,
  Loader2Icon,
  PanelRightCloseIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PullRequestInfo } from "@/lib/types";

const STORAGE_COLLAPSED_KEY = "liveblocks-coding-agents:pr-panel-collapsed";
const STORAGE_WIDTH_KEY = "liveblocks-coding-agents:pr-panel-width";
const DEFAULT_WIDTH = 520;
const MIN_WIDTH = 360;

// Kept at module scope: @pierre/diffs re-renders when this object changes.
const DIFF_OPTIONS: FileDiffOptions<undefined, undefined> = {
  theme: { light: "pierre-light", dark: "pierre-dark" },
  themeType: "system",
  diffStyle: "unified",
  diffIndicators: "bars",
  hunkSeparators: "line-info-basic",
  lineDiffType: "word-alt",
  overflow: "scroll",
  stickyHeader: true,
  // The header renders in a shadow root, so this is the only way to style it.
  // Hide the change-type icon; the chevron already sits in that spot.
  unsafeCSS: "[data-diffs-header] [data-change-icon] { display: none; }",
};
const COLLAPSED_DIFF_OPTIONS: FileDiffOptions<undefined, undefined> = {
  ...DIFF_OPTIONS,
  collapsed: true,
};

function readStorage<T>(key: string, fallback: T, parse: (raw: string) => T) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : parse(raw);
}

/**
 * Shows the pull request the agent opened for this chat, rendered with
 * `@pierre/diffs`. The PR URL comes from feed metadata, so everyone in the
 * chat sees the same panel; the diff itself is fetched live from GitHub.
 */
export function PullRequestPanel({
  prUrl,
  refreshKey,
}: {
  prUrl: string;
  /** Change this to refetch, e.g. when the agent finishes another run */
  refreshKey: string;
}) {
  const [collapsed, setCollapsed] = useState(() =>
    readStorage(STORAGE_COLLAPSED_KEY, false, (raw) => raw === "true")
  );
  const [width, setWidth] = useState(() =>
    readStorage(STORAGE_WIDTH_KEY, DEFAULT_WIDTH, Number)
  );
  const [pr, setPr] = useState<PullRequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  // A PR diff usually spans many files, but `PatchDiff` only accepts a
  // single-file patch, so split it up and render one `FileDiff` per file.
  const files = useMemo<FileDiffMetadata[]>(
    () =>
      pr
        ? parsePatchFiles(pr.diff, `pr-${pr.number}`).flatMap(
            (patch) => patch.files
          )
        : [],
    [pr]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/pr?url=${encodeURIComponent(prUrl)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as
          | PullRequestInfo
          | { error: string };
        if (!response.ok || "error" in body) {
          throw new Error(
            "error" in body ? body.error : "Could not load the pull request"
          );
        }
        setPr(body);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [prUrl, refreshKey, reloadCount]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      localStorage.setItem(STORAGE_COLLAPSED_KEY, String(!current));
      return !current;
    });
  }, []);

  // Drag the left edge to resize; the width is clamped to the viewport.
  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;

      const onMove = (move: PointerEvent) => {
        const max = Math.floor(window.innerWidth * 0.7);
        const next = Math.min(
          max,
          Math.max(MIN_WIDTH, startWidth + (startX - move.clientX))
        );
        setWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setWidth((current) => {
          localStorage.setItem(STORAGE_WIDTH_KEY, String(current));
          return current;
        });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width]
  );

  if (collapsed) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center border-l border-border py-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show pull request"
          aria-label="Show pull request"
          className="flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground"
        >
          <GitPullRequestIcon className="size-4" />
        </button>
        {pr ? (
          <span className="mt-2 text-[10px] font-medium text-subtle [writing-mode:vertical-rl]">
            #{pr.number}
          </span>
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-l border-border bg-background"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startResize}
        className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-accent/30"
      />

      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StateIcon state={pr?.state} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <h2 className="truncate text-[13px] font-semibold">
                {pr?.title ?? "Pull request"}
              </h2>
              {pr ? (
                <span className="shrink-0 text-xs text-subtle">
                  #{pr.number}
                </span>
              ) : null}
            </div>
            {pr ? (
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="truncate font-mono">{pr.branch}</span>
                <span className="shrink-0">
                  <span className="text-success">+{pr.additions}</span>{" "}
                  <span className="text-danger">−{pr.deletions}</span>
                  {" · "}
                  {pr.changedFiles} {pr.changedFiles === 1 ? "file" : "files"}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label="Refresh"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            <RefreshCwIcon
              className={clsx("size-3.5", loading && "animate-spin")}
            />
          </IconButton>
          <IconButton
            label="Open in new window"
            onClick={() => window.open(prUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLinkIcon className="size-3.5" />
          </IconButton>
          <IconButton label="Hide pull request" onClick={toggleCollapsed}>
            <PanelRightCloseIcon className="size-3.5" />
          </IconButton>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="m-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        ) : pr ? (
          <div className="pr-diff flex flex-col gap-3 p-3">
            {files.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No changes to show
              </div>
            ) : (
              files.map((file) => (
                <CollapsibleFileDiff
                  key={file.cacheKey ?? `${file.prevName ?? ""}→${file.name}`}
                  fileDiff={file}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * One file of the PR diff. The library's own header (icon, filename, +/-
 * counts) is kept; a chevron is slotted in front of it via `renderHeaderPrefix`
 * and the whole header toggles the `collapsed` option, which hides the code.
 */
function CollapsibleFileDiff({ fileDiff }: { fileDiff: FileDiffMetadata }) {
  const isPureRename = fileDiff.type === "rename-pure";
  const [collapsed, setCollapsed] = useState(isPureRename);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <FileDiff
        fileDiff={fileDiff}
        options={
          collapsed || isPureRename ? COLLAPSED_DIFF_OPTIONS : DIFF_OPTIONS
        }
        renderHeaderPrefix={() => (
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expand file" : "Collapse file"}
            aria-label={collapsed ? "Expand file" : "Collapse file"}
            aria-expanded={!collapsed}
            className="-ml-2.5 flex size-8 shrink-0 items-center justify-center rounded text-muted transition hover:bg-panel-hover hover:text-foreground"
          >
            <ChevronDownIcon
              className={clsx(
                "size-3.5 transition-transform",
                collapsed && "-rotate-90"
              )}
            />
          </button>
        )}
      />
      {isPureRename && !collapsed ? (
        <div className="border-t border-border px-3 py-2 text-xs text-muted">
          File renamed without changes
        </div>
      ) : null}
    </div>
  );
}

function StateIcon({ state }: { state?: PullRequestInfo["state"] }) {
  if (state === "merged") {
    return <GitMergeIcon className="size-4 shrink-0 text-accent" />;
  }
  if (state === "closed") {
    return <GitPullRequestClosedIcon className="size-4 shrink-0 text-danger" />;
  }
  return <GitPullRequestIcon className="size-4 shrink-0 text-success" />;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}
