"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { BellIcon } from "lucide-react";
import { ChannelList } from "@/components/channel-list";
import { DirectMessageList } from "@/components/direct-message-list";
import { UnreadBadge } from "@/components/unread-badge";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { Selection } from "@/lib/conversations";
import { useUnreadActivity } from "@/lib/use-activity";

export function Sidebar({
  workspaceId,
  userId,
  selection,
  activityOpen,
  onSelect,
  onToggleActivity,
  onUserChange,
  onWorkspaceChange,
}: {
  workspaceId: string;
  userId: string;
  selection: Selection | null;
  activityOpen: boolean;
  onSelect: (selection: Selection) => void;
  onToggleActivity: () => void;
  onUserChange: (userId: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-12 shrink-0 items-center border-b border-sidebar-border px-2">
        <WorkspaceSwitcher
          workspaceId={workspaceId}
          onWorkspaceChange={onWorkspaceChange}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-2 pt-2">
          <ClientSideSuspense fallback={<ActivityNavItem active={activityOpen} />}>
            <ActivityNavItemWithCount
              active={activityOpen}
              onSelect={onToggleActivity}
            />
          </ClientSideSuspense>
        </div>

        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sidebar-muted">
            Channels
          </div>
        </div>

        <ClientSideSuspense fallback={null}>
          <ChannelList
            activeChannelId={
              selection?.type === "channel" ? selection.channelId : null
            }
            onSelectChannel={(channelId) =>
              onSelect({ type: "channel", channelId })
            }
          />
        </ClientSideSuspense>

        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sidebar-muted">
            Direct messages
          </div>
        </div>

        <ClientSideSuspense fallback={null}>
          <DirectMessageList
            activeUserId={selection?.type === "dm" ? selection.userId : null}
            onSelectUser={(userId) => onSelect({ type: "dm", userId })}
          />
        </ClientSideSuspense>
      </div>

      <footer className="shrink-0 border-t border-sidebar-border p-2">
        <UserMenu userId={userId} onUserChange={onUserChange} />
      </footer>
    </aside>
  );
}

function ActivityNavItemWithCount({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: () => void;
}) {
  const unread = useUnreadActivity();
  return (
    <ActivityNavItem active={active} count={unread.length} onSelect={onSelect} />
  );
}

function ActivityNavItem({
  active,
  count = 0,
  onSelect,
}: {
  active: boolean;
  count?: number;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm transition",
        active
          ? "bg-sidebar-active text-white"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <BellIcon className="size-4" aria-hidden />
      <span className="flex-1 text-left font-medium">Activity</span>
      <UnreadBadge count={count} />
    </button>
  );
}
