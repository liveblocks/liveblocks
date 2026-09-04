"use client";

import { useDeleteFeedMessage, useSelf } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { ClockIcon, Trash2Icon } from "lucide-react";
import { AI_USER, getUser } from "@/app/database";
import { AgentParts, PullRequestCard } from "@/components/agent-parts";
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
}: {
  message: ChatMessage;
  feedId: string;
  repoUrl: string;
  // Human message posted while the agent was busy and not yet handled
  queued: boolean;
}) {
  if (message.data.role === "agent") {
    return <AgentMessage message={message} repoUrl={repoUrl} />;
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
  const user = getUser(message.data.userId);
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
          src={user?.info.avatar}
          alt=""
          title={user?.info.name}
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
            <span className="font-medium text-muted">
              {user?.info.name ?? "Unknown user"}
            </span>
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
  repoUrl,
}: {
  message: ChatMessage;
  repoUrl: string;
}) {
  const { status, parts = [], prUrl, branch, repliesTo } = message.data;
  const running = status === "running";

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
      <div className="min-w-0 max-w-[92%] flex-1">
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

        <AgentParts parts={parts} running={running} />

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
