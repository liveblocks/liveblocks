"use client";

import { useEffect, useRef } from "react";
import {
  ClientSideSuspense,
  useCreateFeed,
  useOthers,
  useRoom,
  useSelf,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { AI_USER_ID } from "@/lib/database";
import { ConversationComposer } from "@/features/composer";
import { HelpButton } from "@/features/help";
import { MessageList } from "@/features/messages";
import { ChannelMembers } from "@/features/channels";
import { ThreadPanel } from "@/features/threads";
import { getActivityRootFeedId } from "@/features/activity";
import type { Conversation, MessageHighlight } from "@/lib/navigation";
import { useMarkActivityRead, useUnreadActivity } from "@/features/activity";

export function ConversationView({
  conversation,
  openThreadMessageId,
  highlight = null,
  onOpenThread,
}: {
  conversation: Conversation;
  openThreadMessageId: string | null;
  highlight?: MessageHighlight | null;
  onOpenThread: (messageId: string | null) => void;
}) {
  const createFeed = useCreateFeed();
  const room = useRoom();
  const self = useSelf();
  const ensuredFeedsRef = useRef(new Set<string>());
  const unreadActivity = useUnreadActivity();
  const markActivityRead = useMarkActivityRead();
  const { feedId } = conversation;

  const isAiDm =
    conversation.type === "dm" && conversation.user.id === AI_USER_ID;

  useEffect(() => {
    const seen = unreadActivity.filter(
      (item) =>
        getActivityRootFeedId(item) === feedId &&
        (item.data.parentMessageId === undefined ||
          item.data.parentMessageId === openThreadMessageId)
    );
    if (seen.length > 0) {
      void markActivityRead(seen);
    }
  }, [feedId, markActivityRead, openThreadMessageId, unreadActivity]);

  useEffect(() => {
    if (ensuredFeedsRef.current.has(feedId)) {
      return;
    }

    ensuredFeedsRef.current.add(feedId);

    const ensureFeed = async () => {
      try {
        await createFeed(
          feedId,
          conversation.type === "channel"
            ? { metadata: { name: conversation.channel.name, type: "channel" } }
            : {
                metadata: {
                  type: "dm",
                  participantIds: [self.id, conversation.user.id].sort(),
                },
              }
        );
      } catch {}
    };

    void ensureFeed();
  }, [conversation, createFeed, feedId, self.id]);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
          {conversation.type === "channel" ? (
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-neutral-900">
                #{conversation.channel.name}
              </h2>
            </div>
          ) : (
            <DmHeader user={conversation.user} />
          )}
          <div className="ml-auto flex items-center gap-2">
            {conversation.type === "channel" ? (
              <ClientSideSuspense fallback={null}>
                <ChannelMembers />
              </ClientSideSuspense>
            ) : null}
            <HelpButton />
          </div>
        </header>

        <ClientSideSuspense fallback={<div className="min-h-0 flex-1" />}>
          <MessageList
            conversation={conversation}
            highlightedMessageId={
              highlight?.feedId === feedId ? highlight.messageId : null
            }
            onOpenThread={isAiDm ? undefined : onOpenThread}
          />
        </ClientSideSuspense>
        <ClientSideSuspense fallback={null}>
          <ConversationComposer
            conversation={conversation}
            roomId={room.id}
            onOpenThread={isAiDm ? undefined : onOpenThread}
          />
        </ClientSideSuspense>
      </div>

      {openThreadMessageId ? (
        <ClientSideSuspense fallback={null}>
          <ThreadPanel
            channelId={feedId}
            parentMessageId={openThreadMessageId}
            roomId={room.id}
            highlight={highlight}
            onClose={() => onOpenThread(null)}
          />
        </ClientSideSuspense>
      ) : null}
    </div>
  );
}

function DmHeader({ user }: { user: Liveblocks["UserMeta"] }) {
  const isAgent = user.id === AI_USER_ID;
  const isOnline = useOthers(
    (others) => isAgent || others.some((other) => other.id === user.id)
  );

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="relative inline-block size-7 min-h-7 min-w-7 shrink-0 rounded-md bg-neutral-200">
        <img
          src={user.info.avatar}
          alt=""
          className="size-full rounded-md object-cover"
        />
        <span
          className={clsx(
            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white",
            isOnline ? "bg-green-500" : "bg-neutral-400"
          )}
          aria-label={isOnline ? "Online" : "Offline"}
        />
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-lg font-bold text-neutral-900">
          {user.info.name}
        </h2>
        {isAgent ? (
          <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Agent
          </span>
        ) : (
          <span className="shrink-0 text-xs text-neutral-500">
            {isOnline ? "Online" : "Offline"}
          </span>
        )}
      </div>
    </div>
  );
}
