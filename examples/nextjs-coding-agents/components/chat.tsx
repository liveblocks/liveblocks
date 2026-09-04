"use client";

import {
  ClientSideSuspense,
  useFeeds,
  useInboxNotifications,
  useMarkInboxNotificationAsRead,
  useUpdateFeedMetadata,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  CircleAlertIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Composer } from "@/components/composer";
import { HelpButton } from "@/components/help-button";
import { MessageList } from "@/components/message-list";
import { PresenceAvatars } from "@/components/presence-avatars";
import { getRepoName } from "@/lib/repo";
import type { ChatFeed } from "@/lib/types";
import { useSendMessage } from "@/lib/use-send-message";

export function Chat({ feedId }: { feedId: string }) {
  const { feeds } = useFeeds({ metadata: { type: "chat" } });
  const feed = feeds.find((candidate) => candidate.feedId === feedId);

  if (!feed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
        <p>This chat doesn&apos;t exist or was deleted.</p>
        <Link href="/" className="text-accent-foreground underline">
          Start a new chat
        </Link>
      </div>
    );
  }

  return <ChatView feed={feed} />;
}

function ChatView({ feed }: { feed: ChatFeed }) {
  const sendMessage = useSendMessage();
  const updateFeedMetadata = useUpdateFeedMetadata();
  const [error, setError] = useState<string | null>(null);
  const { feedId, metadata } = feed;
  const running = metadata.agentStatus === "running";

  const handleSend = useCallback(
    async (content: string) => {
      setError(null);
      try {
        await sendMessage(feedId, content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        // Rethrow so the composer restores the draft.
        throw err;
      }
    },
    [feedId, sendMessage]
  );

  // Feed metadata updates replace the whole object, so send everything back
  // with the changed model rather than just the changed key.
  const handleModelChange = useCallback(
    (model: string) => updateFeedMetadata(feedId, { ...metadata, model }),
    [feedId, metadata, updateFeedMetadata]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h1 className="truncate text-[13px] font-semibold">
            {metadata.title || "New chat"}
          </h1>
          <span className="hidden items-center gap-1.5 truncate text-xs text-muted md:flex">
            <GitBranchIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {getRepoName(metadata.repoUrl)}
              <span className="text-subtle">
                {" "}
                · {metadata.branch ?? metadata.repoRef}
              </span>
            </span>
          </span>
          <StatusPill running={running} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {metadata.prUrl ? (
            <a
              href={metadata.prUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium transition hover:bg-panel-hover"
            >
              <GitPullRequestIcon className="size-3.5 text-success" />
              View PR
            </a>
          ) : null}
          <ClientSideSuspense fallback={null}>
            <PresenceAvatars />
          </ClientSideSuspense>
          <HelpButton />
        </div>
      </header>

      <ClientSideSuspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        }
      >
        <MessageList feedId={feedId} repoUrl={metadata.repoUrl} />
        <AutoReadNotifications feedId={feedId} />
      </ClientSideSuspense>

      <div className="shrink-0 px-6 pb-3">
        <div className="mx-auto w-full max-w-3xl">
          {error ? (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss"
                className="rounded p-0.5 hover:bg-danger/10"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ) : null}
          <ClientSideSuspense fallback={null}>
            <Composer
              typingKey={feedId}
              placeholder={
                running
                  ? "Ask a follow-up — the agent will get to it after the current task"
                  : "Ask the agent to make a change…"
              }
              repo={{ url: metadata.repoUrl, ref: metadata.repoRef }}
              model={metadata.model}
              onModelChange={handleModelChange}
              onSend={handleSend}
            />
          </ClientSideSuspense>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ running }: { running: boolean }) {
  return (
    <span
      className={clsx(
        "hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
        running
          ? "bg-accent-soft text-accent-foreground"
          : "bg-panel text-muted"
      )}
    >
      {running ? (
        <>
          <Loader2Icon className="size-3 animate-spin" />
          Working
        </>
      ) : (
        <>
          <span className="size-1.5 rounded-full bg-subtle" />
          Idle
        </>
      )}
    </span>
  );
}

/**
 * Notifications about this chat are marked as read while it's open, so the
 * bell only counts what you haven't seen.
 */
function AutoReadNotifications({ feedId }: { feedId: string }) {
  const { inboxNotifications } = useInboxNotifications();
  const markAsRead = useMarkInboxNotificationAsRead();

  useEffect(() => {
    for (const notification of inboxNotifications) {
      if (
        notification.kind === "$agentRunCompleted" &&
        notification.readAt === null &&
        notification.activities[0]?.data.feedId === feedId
      ) {
        markAsRead(notification.id);
      }
    }
  }, [feedId, inboxNotifications, markAsRead]);

  return null;
}
