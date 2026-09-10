"use client";

import { parsePatchFiles, type FileDiffMetadata } from "@pierre/diffs";
import { FileDiff, type FileDiffOptions } from "@pierre/diffs/react";
import clsx from "clsx";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PanelIconButton } from "@/components/side-panel";
import type { ChangesInfo } from "@/lib/types";

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

function countChanges(diff: string) {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }
  return { additions, deletions };
}

/**
 * The agent's changes for this chat, rendered with `@pierre/diffs`. The
 * agent saves a diff as a Cursor artifact at the end of every run, so this
 * is available as soon as the first run finishes, before any pull request
 * exists, and updates as follow-up runs land. Everyone in the chat sees the
 * same thing since the trigger lives in feed metadata.
 */
export function ChangesView({
  roomId,
  feedId,
  repoUrl,
  branch,
  prUrl,
  refreshKey,
}: {
  roomId: string;
  feedId: string;
  repoUrl: string;
  branch?: string;
  prUrl?: string;
  /** Change this to refetch, e.g. when the agent finishes another run */
  refreshKey: string;
}) {
  const [changes, setChanges] = useState<ChangesInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  // The diff usually spans many files, but `PatchDiff` only accepts a
  // single-file patch, so split it up and render one `FileDiff` per file.
  const files = useMemo<FileDiffMetadata[]>(
    () =>
      changes
        ? parsePatchFiles(
            changes.diff,
            `${feedId}-${changes.updatedAt}`
          ).flatMap((patch) => patch.files)
        : [],
    [changes, feedId]
  );
  const stats = useMemo(
    () => (changes ? countChanges(changes.diff) : null),
    [changes]
  );

  // Where "open on GitHub" goes: the PR when there is one, else the branch.
  const externalUrl = prUrl ?? (branch ? `${repoUrl}/tree/${branch}` : repoUrl);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const search = new URLSearchParams({ roomId, feedId });
    fetch(`/api/diff?${search}`, { signal: controller.signal })
      .then(async (response) => {
        // Shape is defined by /api/diff
        const body = (await response.json()) as ChangesInfo | { error: string };
        if (!response.ok || "error" in body) {
          throw new Error(
            "error" in body ? body.error : "Could not load the changes"
          );
        }
        setChanges(body);
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
  }, [feedId, roomId, refreshKey, reloadCount]);

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        {prUrl ? (
          <GitPullRequestIcon className="size-4 shrink-0 text-success" />
        ) : (
          <GitBranchIcon className="size-4 shrink-0 text-muted" />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted">
          {prUrl ? (
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-medium text-accent-foreground hover:underline"
            >
              Pull request #{prUrl.split("/").pop()}
            </a>
          ) : null}
          {branch ? <span className="truncate font-mono">{branch}</span> : null}
          {stats ? (
            <span className="shrink-0">
              <span className="text-success">+{stats.additions}</span>{" "}
              <span className="text-danger">−{stats.deletions}</span>
              {" · "}
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <PanelIconButton
            label="Refresh"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            <RefreshCwIcon
              className={clsx("size-3.5", loading && "animate-spin")}
            />
          </PanelIconButton>
          <PanelIconButton
            label="Open on GitHub"
            onClick={() =>
              window.open(externalUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLinkIcon className="size-3.5" />
          </PanelIconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="m-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        ) : changes ? (
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
    </>
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
