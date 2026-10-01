"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { ChannelList } from "@/components/channel-list";
import { DirectMessageList } from "@/components/direct-message-list";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { Selection } from "@/lib/conversations";

export function Sidebar({
  workspaceId,
  userId,
  selection,
  onSelect,
  onUserChange,
  onWorkspaceChange,
}: {
  workspaceId: string;
  userId: string;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
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
