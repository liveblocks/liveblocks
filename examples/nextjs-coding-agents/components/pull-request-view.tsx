"use client";

import clsx from "clsx";
import {
  CircleAlertIcon,
  ExternalLinkIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PanelIconButton } from "@/components/side-panel";
import { Markdown } from "@/lib/markdown";
import type { PullRequestResponse } from "@/lib/types";

/**
 * The pull request's title and description, read from GitHub. Sits next to
 * the Changes tab; `refreshKey` changes when a run pushes again, since the
 * agent updates the description along with the code.
 */
export function PullRequestView({
  prUrl,
  refreshKey,
}: {
  prUrl: string;
  refreshKey: string;
}) {
  const [pullRequest, setPullRequest] =
    useState<PullRequestResponse["pullRequest"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/pull-request?url=${encodeURIComponent(prUrl)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Couldn't load the pull request");
        }
        // Shape is defined by /api/pull-request
        return (await response.json()) as PullRequestResponse;
      })
      .then((result) => {
        if (result.error || !result.pullRequest) {
          throw new Error(result.error ?? "Couldn't load the pull request");
        }
        setPullRequest(result.pullRequest);
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

  const state = pullRequest
    ? pullRequest.draft && pullRequest.state === "open"
      ? "draft"
      : pullRequest.state
    : null;

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <StateIcon state={state} />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted">
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium text-accent-foreground hover:underline"
          >
            Pull request #{pullRequest?.number ?? prUrl.split("/").pop()}
          </a>
          {state ? <span className="shrink-0 capitalize">{state}</span> : null}
          {pullRequest?.author ? (
            <span className="truncate">by {pullRequest.author.name}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <PanelIconButton
            label="Refresh"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            <RefreshCwIcon
              className={clsx("size-4", loading && "animate-spin")}
            />
          </PanelIconButton>
          <PanelIconButton
            label="Open on GitHub"
            onClick={() => window.open(prUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLinkIcon className="size-4" />
          </PanelIconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="m-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        ) : pullRequest ? (
          <div className="p-5">
            <h2 className="text-base font-semibold leading-snug tracking-tight">
              {pullRequest.title}
            </h2>
            {pullRequest.body.trim() ? (
              <Markdown
                content={pullRequest.body}
                className="prose-chat prose-document mt-4 text-sm leading-relaxed"
              />
            ) : (
              <p className="mt-4 text-xs text-muted">
                This pull request has no description.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}

function StateIcon({
  state,
}: {
  state: "open" | "closed" | "merged" | "draft" | null;
}) {
  switch (state) {
    case "merged":
      return <GitMergeIcon className="size-4 shrink-0 text-accent" />;
    case "closed":
      return (
        <GitPullRequestClosedIcon className="size-4 shrink-0 text-danger" />
      );
    case "draft":
      return <GitPullRequestDraftIcon className="size-4 shrink-0 text-muted" />;
    default:
      return <GitPullRequestIcon className="size-4 shrink-0 text-success" />;
  }
}
