"use client";

import { useUser } from "@liveblocks/react";
import {
  useDeleteFeedMessage,
  useRoom,
  useSelf,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { ClockIcon, Loader2Icon, SquareIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useCanWrite } from "@/app/providers";
import { AI_USER } from "@/lib/agent-user";
import {
  AgentParts,
  PullRequestCard,
  WorkLog,
} from "@/components/agent-parts";
import { Markdown } from "@/lib/markdown";
import { getRepoName } from "@/lib/repo";
import type { ChatMessage } from "@/lib/types";

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function Message({
  message,
  feedId,
  repoUrl,
  queued,
  holding,
}: {
  message: ChatMessage;
  feedId: string;
  repoUrl: string;
  // Human message posted while the agent was busy and not yet handled
  queued: boolean;
  // Running agent message with queued human messages behind it: its text so
  // far is a draft that will be revised, so it isn't shown
  holding: boolean;
}) {
  if (message.data.role === "agent") {
    return (
      <AgentMessage
        message={message}
        feedId={feedId}
        repoUrl={repoUrl}
        holding={holding}
      />
    );
  }
  return <HumanMessage message={message} feedId={feedId} queued={queued} />;
}

function HumanMessage({
  message,
  feedId,
  queued,
}: {
  message: ChatMessage;
  feedId: string;
  queued: boolean;
}) {
  const self = useSelf();
  const deleteFeedMessage = useDeleteFeedMessage();
  const { user } = useUser(message.data.userId);
  const displayName = user?.name ?? message.data.userId;
  const avatarUrl =
    user?.avatar ?? `https://github.com/${message.data.userId}.png?size=64`;
  const isOwn = self.id === message.data.userId;
  const canDelete = isOwn && !message.data.handled;

  return (
    <div
      className={clsx(
        "group flex items-end gap-2.5",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isOwn ? (
        <img
          src={avatarUrl}
          alt=""
          title={displayName}
          className="mb-5 size-7 shrink-0 rounded-md bg-panel object-cover"
        />
      ) : null}

      <div
        className={clsx(
          "flex min-w-0 max-w-[85%] flex-col gap-1",
          isOwn ? "items-end" : "items-start"
        )}
      >
        <div
          className={clsx(
            "rounded-2xl px-3.5 py-2",
            isOwn
              ? "rounded-br-md bg-bubble"
              : "rounded-bl-md border border-border bg-background"
          )}
        >
          <Markdown content={message.data.content} />
        </div>
        <div
          className={clsx(
            "flex items-center gap-2 px-1 text-[11px] text-subtle",
            isOwn && "flex-row-reverse"
          )}
        >
          {!isOwn ? (
            <span className="font-medium text-muted">{displayName}</span>
          ) : null}
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {formatTime(message.createdAt)}
          </time>
          {queued ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-px font-medium text-warning">
              <ClockIcon className="size-3" />
              Queued
            </span>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => deleteFeedMessage(feedId, message.id)}
              aria-label="Delete message"
              className="rounded p-0.5 opacity-0 transition hover:text-danger group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2Icon className="size-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AgentMessage({
  message,
  feedId,
  repoUrl,
  holding,
}: {
  message: ChatMessage;
  feedId: string;
  repoUrl: string;
  holding: boolean;
}) {
  const canWrite = useCanWrite();
  const {
    status,
    parts = [],
    content,
    prUrl,
    branch,
    repliesTo,
    finishedAt,
  } = message.data;
  const running = status === "running";

  // Once finished, the reply is the agent's closing message, and everything
  // it did along the way (planning, tool calls, interim notes) folds away
  // behind "Worked for…". The closing message is the last text streamed in;
  // `content` holds the run's result for messages stored without parts.
  const lastPart = parts[parts.length - 1];
  const summary =
    (lastPart?.type === "text" ? lastPart.text.trim() : "") || content.trim();
  const logParts = parts.filter(
    (part, index) =>
      part.type !== "error" &&
      !(index === parts.length - 1 && part.type === "text" && summary)
  );
  const errorParts = parts.filter((part) => part.type === "error");
  const durationMs = (finishedAt ?? message.updatedAt) - message.createdAt;

  return (
    <div className="flex items-start gap-2.5">
      <img
        src={AI_USER.info.avatar}
        alt=""
        title={AI_USER.info.name}
        className={clsx(
          "mt-0.5 size-7 shrink-0 rounded-md bg-panel object-cover",
          running && "ring-2 ring-accent/40"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2 text-[11px] text-subtle">
          <span className="text-[13px] font-medium text-foreground">
            {AI_USER.info.name}
          </span>
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {formatTime(message.createdAt)}
          </time>
          {running ? (
            <span className="inline-flex items-center gap-1 text-accent">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              Working
            </span>
          ) : status === "error" ? (
            <span className="text-danger">Failed</span>
          ) : repliesTo && repliesTo.length > 1 ? (
            <span>Replied to {repliesTo.length} messages</span>
          ) : null}
        </div>

        {running ? (
          <AgentParts parts={parts} running holding={holding} />
        ) : (
          <div className="flex flex-col gap-2">
            <WorkLog
              parts={logParts}
              durationMs={durationMs}
              status={status === "error" ? "error" : "done"}
            />
            {summary ? <Markdown content={summary} /> : null}
            {errorParts.length > 0 ? (
              <AgentParts parts={errorParts} running={false} />
            ) : null}
          </div>
        )}

        {running && canWrite ? <StopRunButton feedId={feedId} /> : null}

        {!running ? (
          <PullRequestCard
            prUrl={prUrl}
            branch={branch}
            repoName={getRepoName(repoUrl)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Cancels the Cursor run behind a working agent message. Anyone on the team
 * can press it; the message credits whoever did once the workflow wraps up.
 */
function StopRunButton({ feedId }: { feedId: string }) {
  const room = useRoom();
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent unmounts this once the message leaves "running", so a
  // successful stop needs no local reset. Failures re-enable the button.
  useEffect(() => {
    if (!error) {
      return;
    }
    const timeout = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timeout);
  }, [error]);

  const stop = async () => {
    setStopping(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, feedId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "The run could not be stopped.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStopping(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={stop}
        disabled={stopping}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted transition hover:border-danger/40 hover:text-danger disabled:cursor-default disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted"
      >
        {stopping ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : (
          <SquareIcon className="size-3 fill-current" />
        )}
        {stopping ? "Stopping…" : "Stop run"}
      </button>
      {error ? <span className="text-danger">{error}</span> : null}
    </div>
  );
}
