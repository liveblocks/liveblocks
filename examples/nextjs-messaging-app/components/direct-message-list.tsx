"use client";

import { useFeedMessages } from "@liveblocks/react";
import { useFeeds, useOthersMapped, useSelf } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { useMemo } from "react";
import { AI_USER, AI_USER_ID, getUsers } from "@/app/database";
import { Avatar } from "@/components/avatar";
import {
  MessagePreview,
  PreviewRow,
  PreviewSkeleton,
} from "@/components/preview-row";
import { UnreadBadge } from "@/components/unread-badge";
import { getActivityRootFeedId, isChatMessage } from "@/lib/activity";
import { getDmFeedId } from "@/lib/conversations";
import { useUnreadActivity } from "@/lib/use-activity";

type DirectMessageUser = {
  user: Liveblocks["UserMeta"];
  feedId: string;
  isAgent: boolean;
  isOnline: boolean;
  active: boolean;
  unreadCount: number;
};

export function DirectMessageList({
  activeUserId,
  onSelectUser,
  variant = "compact",
}: {
  activeUserId: string | null;
  onSelectUser: (userId: string) => void;
  // `compact` is the plain name list under Channels; `detailed` is the DMs
  // tab, laid out like Activity with a preview of the latest message.
  variant?: "compact" | "detailed";
}) {
  const selfId = useSelf((me) => me.id);
  const otherIds = useOthersMapped((other) => other.id);
  const onlineIds = useMemo(() => new Set(otherIds.map(([, id]) => id)), [otherIds]);
  const unreadActivity = useUnreadActivity();
  // Everything that happened in a DM counts towards its badge.
  const unreadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of unreadActivity) {
      const rootFeedId = getActivityRootFeedId(item);
      counts.set(rootFeedId, (counts.get(rootFeedId) ?? 0) + 1);
    }
    return counts;
  }, [unreadActivity]);

  // Every other demo user, plus the AI teammate, can be messaged directly.
  const users = useMemo<DirectMessageUser[]>(
    () =>
      [...getUsers().filter((user) => user.id !== selfId), AI_USER].map(
        (user) => {
          const isAgent = user.id === AI_USER_ID;
          const feedId = getDmFeedId(selfId, user.id);
          return {
            user,
            feedId,
            isAgent,
            isOnline: isAgent || onlineIds.has(user.id),
            active: user.id === activeUserId,
            unreadCount: unreadCounts.get(feedId) ?? 0,
          };
        }
      ),
    [activeUserId, onlineIds, selfId, unreadCounts]
  );

  if (variant === "detailed") {
    return (
      <DetailedList users={users} selfId={selfId} onSelectUser={onSelectUser} />
    );
  }

  return (
    <ul className="space-y-0.5 px-2 pb-2">
      {users.map(({ user, isAgent, isOnline, active, unreadCount }) => (
        <li key={user.id}>
          <button
            type="button"
            onClick={() => onSelectUser(user.id)}
            className={clsx(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
              active
                ? "bg-neutral-800 text-white"
                : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
            )}
          >
            <Avatar
              user={user}
              size="sm"
              online={isOnline}
              ringClassName={active ? "border-neutral-800" : "border-white"}
            />
            <span
              className={clsx(
                "min-w-0 flex-1 truncate",
                unreadCount > 0 && !active && "font-semibold text-neutral-900"
              )}
            >
              {user.info.name}
            </span>
            <UnreadBadge count={unreadCount} />
            {isAgent ? (
              <AgentBadge
                className={
                  active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-600"
                }
              />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function DetailedList({
  users,
  selfId,
  onSelectUser,
}: {
  users: DirectMessageUser[];
  selfId: string;
  onSelectUser: (userId: string) => void;
}) {
  // A DM feed only exists once someone has opened that conversation. Only
  // load messages for feeds that exist, so rows for fresh DMs don't error.
  const { feeds: dmFeeds } = useFeeds({ metadata: { type: "dm" } });
  const existingFeedIds = useMemo(
    () => new Set(dmFeeds.map((feed) => feed.feedId)),
    [dmFeeds]
  );

  return (
    <ul className="py-2">
      {users.map((entry) =>
        existingFeedIds.has(entry.feedId) ? (
          <DetailedRow
            key={entry.user.id}
            entry={entry}
            selfId={selfId}
            onOpen={() => onSelectUser(entry.user.id)}
          />
        ) : (
          <PreviewRow
            key={entry.user.id}
            active={entry.active}
            unread={false}
            user={entry.user}
            online={entry.isOnline}
            title={<DmTitle entry={entry} />}
            onOpen={() => onSelectUser(entry.user.id)}
          >
            <span className="text-neutral-500">No messages yet</span>
          </PreviewRow>
        )
      )}
    </ul>
  );
}

function DmTitle({ entry }: { entry: DirectMessageUser }) {
  return (
    <>
      <span
        className={clsx(
          "min-w-0 truncate font-semibold",
          entry.unreadCount > 0 ? "text-neutral-900" : "text-neutral-700"
        )}
      >
        {entry.user.info.name}
      </span>
      {entry.isAgent ? (
        <AgentBadge className="bg-brand-100 text-brand-600" />
      ) : null}
    </>
  );
}

// A DM whose feed exists: previews its newest message, kept live so
// streaming AI replies, edits and deletions show up.
function DetailedRow({
  entry,
  selfId,
  onOpen,
}: {
  entry: DirectMessageUser;
  selfId: string;
  onOpen: () => void;
}) {
  const { messages, isLoading, error } = useFeedMessages(entry.feedId);
  const latest = useMemo(() => {
    let latest = undefined;
    for (const message of messages ?? []) {
      if (!isChatMessage(message)) {
        continue;
      }
      if (!latest || message.createdAt > latest.createdAt) {
        latest = message;
      }
    }
    return latest;
  }, [messages]);

  return (
    <PreviewRow
      active={entry.active}
      unread={entry.unreadCount > 0}
      user={entry.user}
      online={entry.isOnline}
      title={<DmTitle entry={entry} />}
      time={latest?.createdAt}
      indicator={<UnreadBadge count={entry.unreadCount} color="brand" />}
      onOpen={onOpen}
    >
      {latest ? (
        <MessagePreview
          message={latest}
          prefix={
            latest.data.userId === selfId ? (
              <span className="text-neutral-500">You: </span>
            ) : undefined
          }
        />
      ) : error ? (
        <span className="text-neutral-500">Messages unavailable</span>
      ) : isLoading ? (
        <PreviewSkeleton />
      ) : (
        <span className="text-neutral-500">No messages yet</span>
      )}
    </PreviewRow>
  );
}

function AgentBadge({ className }: { className: string }) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      Agent
    </span>
  );
}
