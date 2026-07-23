"use client";

import { ChannelList } from "@/components/channel-list";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export function Sidebar({
  workspaceId,
  userId,
  activeChannelId,
  onSelectChannel,
  onUserChange,
  onWorkspaceChange,
}: {
  workspaceId: string;
  userId: string;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onUserChange: (userId: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col text-[var(--sidebar-text)]"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      <header
        className="flex h-12 shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <WorkspaceSwitcher
          workspaceId={workspaceId}
          onWorkspaceChange={onWorkspaceChange}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-text-muted)]">
            Channels
          </div>
        </div>

        <ChannelList
          activeChannelId={activeChannelId}
          onSelectChannel={onSelectChannel}
        />
      </div>

      <footer
        className="shrink-0 border-t p-2"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <UserMenu userId={userId} onUserChange={onUserChange} />
      </footer>
    </aside>
  );
}
