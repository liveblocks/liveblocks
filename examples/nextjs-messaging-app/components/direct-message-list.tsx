"use client";

import { useOthersMapped, useSelf } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { useMemo } from "react";
import { AI_USER, AI_USER_ID, getUsers } from "@/app/database";
import { UnreadBadge } from "@/components/unread-badge";
import { getActivityRootFeedId } from "@/lib/activity";
import { getDmFeedId } from "@/lib/conversations";
import { useUnreadActivity } from "@/lib/use-activity";

export function DirectMessageList({
  activeUserId,
  onSelectUser,
}: {
  activeUserId: string | null;
  onSelectUser: (userId: string) => void;
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
  const users = useMemo(
    () => [...getUsers().filter((user) => user.id !== selfId), AI_USER],
    [selfId]
  );

  return (
    <ul className="space-y-0.5 px-2 pb-2">
      {users.map((user) => {
        const isAgent = user.id === AI_USER_ID;
        const isOnline = isAgent || onlineIds.has(user.id);
        const active = user.id === activeUserId;
        const unreadCount = unreadCounts.get(getDmFeedId(selfId, user.id)) ?? 0;

        return (
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
              <span className="relative inline-block size-5 min-h-5 min-w-5 shrink-0 overflow-visible rounded bg-neutral-200">
                <img
                  src={user.info.avatar}
                  alt=""
                  className="size-full rounded object-cover"
                />
                <span
                  className={clsx(
                    "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2",
                    active ? "border-neutral-800" : "border-white",
                    isOnline ? "bg-green-500" : "bg-neutral-400"
                  )}
                  aria-label={isOnline ? "Online" : "Offline"}
                />
              </span>
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
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-brand-100 text-brand-600"
                  )}
                >
                  Agent
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
