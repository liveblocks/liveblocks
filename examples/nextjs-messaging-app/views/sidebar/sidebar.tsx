"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ActivityPanel, type ActivityTarget } from "@/features/activity";
import { ChannelList } from "@/features/channels";
import { ColumnHeader } from "@/primitives/column-header";
import { ResizeHandle } from "@/primitives/resize-handle";
import { DirectMessageList } from "@/features/direct-messages";
import type { SidebarTab } from "@/lib/navigation";
import type { Selection } from "@/lib/navigation";
import { SIDEBAR_PANEL, usePanelWidth } from "@/lib/panel-width";

export function Sidebar({
  workspaceName,
  view,
  selection,
  activeActivityItemId,
  onSelect,
  onActivityNavigate,
}: {
  workspaceName: string;
  view: SidebarTab;
  selection: Selection | null;
  activeActivityItemId: string | null;
  onSelect: (selection: Selection) => void;
  onActivityNavigate: (target: ActivityTarget) => void;
}) {
  const activeChannelId =
    selection?.type === "channel" ? selection.channelId : null;
  const activeDmUserId = selection?.type === "dm" ? selection.userId : null;
  const [width, setWidth] = usePanelWidth(SIDEBAR_PANEL);

  return (
    <aside
      aria-label="Sidebar"
      className="relative flex shrink-0 flex-col bg-white text-neutral-900"
      style={{ width }}
    >
      <ResizeHandle
        edge="right"
        width={width}
        config={SIDEBAR_PANEL}
        label="Resize sidebar"
        onWidthChange={setWidth}
      />
      {view === "activity" ? (
        <ClientSideSuspense fallback={<ColumnHeader title="Activity" />}>
          <ActivityPanel
            activeItemId={activeActivityItemId}
            onNavigate={onActivityNavigate}
          />
        </ClientSideSuspense>
      ) : (
        <>
          <ColumnHeader
            title={view === "dms" ? "Direct messages" : workspaceName}
          />

          <div
            className={clsx(
              "min-h-0 flex-1 overflow-y-auto",
              view === "home" && "pb-2"
            )}
          >
            {view === "home" ? (
              <>
                <SectionTitle>Channels</SectionTitle>
                <ClientSideSuspense fallback={null}>
                  <ChannelList
                    activeChannelId={activeChannelId}
                    onSelectChannel={(channelId) =>
                      onSelect({ type: "channel", channelId })
                    }
                  />
                </ClientSideSuspense>
                <SectionTitle>Direct messages</SectionTitle>
              </>
            ) : null}

            <ClientSideSuspense fallback={null}>
              <DirectMessageList
                activeUserId={activeDmUserId}
                onSelectUser={(userId) => onSelect({ type: "dm", userId })}
                variant={view === "dms" ? "detailed" : "compact"}
              />
            </ClientSideSuspense>
          </div>
        </>
      )}
    </aside>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-1 pt-4 text-sm text-neutral-700 first:pt-1">
      {children}
    </div>
  );
}
