"use client";

import {
  ClientSideSuspense,
  useFeeds,
  useInboxNotifications,
  useMarkInboxNotificationAsRead,
  useRoom,
  useUpdateFeedMetadata,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  CircleAlertIcon,
  EyeIcon,
  GitBranchIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCanWrite } from "@/app/providers";
import { ChangesPanel } from "@/components/changes-panel";
import { Composer } from "@/components/composer";
import { HelpButton } from "@/components/help-button";
import { MessageList } from "@/components/message-list";
import { NewChat } from "@/components/new-chat";
import { PresenceAvatars } from "@/components/presence-avatars";
import { capitalizeFirst } from "@/lib/prompt";
import { getRepoName } from "@/lib/repo";
import type { ChatFeed } from "@/lib/types";
import { useSendMessage } from "@/lib/use-send-message";

/**
 * A chat's id is chosen before it exists: "New chat" navigates to a fresh
 * `/chat/[id]`, which shows the empty state until the first message creates
 * the feed, at which point this swaps to the conversation without leaving
 * the page. The error state lives here so a failure while sending that first
 * message survives the swap.
 */
export function Chat({ feedId }: { feedId: string }) {
  const { feeds } = useFeeds({ metadata: { type: "chat" } });
  const feed = feeds.find((candidate) => candidate.feedId === feedId);
  const [error, setError] = useState<string | null>(null);

  if (!feed) {
    return <NewChat feedId={feedId} error={error} onError={setError} />;
  }

  return <ChatView feed={feed} error={error} onError={setError} />;
}

function ChatView({
  feed,
  error,
  onError: setError,
}: {
  feed: ChatFeed;
  error: string | null;
  onError: (error: string | null) => void;
}) {
  const room = useRoom();
  const canWrite = useCanWrite();
  const sendMessage = useSendMessage();
  const updateFeedMetadata = useUpdateFeedMetadata();
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
    [feedId, sendMessage, setError]
  );

  // Feed metadata updates replace the whole object, so send everything back
  // with the changed model rather than just the changed key.
  const handleModelChange = useCallback(
    (model: string) => updateFeedMetadata(feedId, { ...metadata, model }),
    [feedId, metadata, updateFeedMetadata]
  );

  return (
    <div className="flex h-full min-h-0">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate text-[13px] font-semibold">
              {capitalizeFirst(metadata.title || "New chat")}
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
            {canWrite ? (
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
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2.5 text-xs text-muted">
                <EyeIcon className="size-3.5 shrink-0" />
                You&apos;re watching this chat with read-only access.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shown once the agent saved a diff or pushed a branch */}
      {metadata.diffUpdatedAt || metadata.branch ? (
        <ChangesPanel
          roomId={room.id}
          feedId={feedId}
          repoUrl={metadata.repoUrl}
          branch={metadata.branch}
          prUrl={metadata.prUrl}
          // Refetch once a run finishes and saves a new diff
          refreshKey={metadata.diffUpdatedAt ?? metadata.branch ?? ""}
        />
      ) : null}
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
