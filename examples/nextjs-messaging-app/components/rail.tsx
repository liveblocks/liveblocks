"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  BellIcon,
  HomeIcon,
  MessageCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { getActivityRootFeedId } from "@/lib/activity";
import { isDmFeedId } from "@/lib/conversations";
import { useUnreadActivity } from "@/lib/use-activity";

// Which list the secondary column shows
export type View = "home" | "dms" | "activity";

export function Rail({
  workspaceId,
  userId,
  view,
  onViewChange,
  onUserChange,
  onWorkspaceChange,
}: {
  workspaceId: string;
  userId: string;
  view: View;
  onViewChange: (view: View) => void;
  onUserChange: (userId: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center bg-sidebar py-3 text-sidebar-foreground">
      <WorkspaceSwitcher
        workspaceId={workspaceId}
        onWorkspaceChange={onWorkspaceChange}
      />

      <ClientSideSuspense fallback={<RailItems view={view} onViewChange={onViewChange} />}>
        <RailItemsWithUnread view={view} onViewChange={onViewChange} />
      </ClientSideSuspense>

      <div className="mt-auto">
        <UserMenu userId={userId} onUserChange={onUserChange} />
      </div>
    </nav>
  );
}

function RailItemsWithUnread({
  view,
  onViewChange,
}: {
  view: View;
  onViewChange: (view: View) => void;
}) {
  const unread = useUnreadActivity();
  const dots = useMemo(() => {
    let home = false;
    let dms = false;
    for (const item of unread) {
      if (isDmFeedId(getActivityRootFeedId(item))) {
        dms = true;
      } else if (item.data.type === "mention") {
        home = true;
      }
    }
    return { home, dms, activity: unread.length > 0 };
  }, [unread]);

  return <RailItems view={view} onViewChange={onViewChange} dots={dots} />;
}

function RailItems({
  view,
  onViewChange,
  dots,
}: {
  view: View;
  onViewChange: (view: View) => void;
  dots?: Record<View, boolean>;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <RailItem
        icon={HomeIcon}
        label="Home"
        active={view === "home"}
        dot={dots?.home ?? false}
        onClick={() => onViewChange("home")}
      />
      <RailItem
        icon={MessageCircleIcon}
        label="DMs"
        active={view === "dms"}
        dot={dots?.dms ?? false}
        onClick={() => onViewChange("dms")}
      />
      <RailItem
        icon={BellIcon}
        label="Activity"
        active={view === "activity"}
        dot={dots?.activity ?? false}
        onClick={() => onViewChange("activity")}
      />
    </div>
  );
}

function RailItem({
  icon: Icon,
  label,
  active,
  dot,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  dot: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="group flex w-16 flex-col items-center gap-1 py-1 text-[11px] font-medium"
    >
      <span
        className={clsx(
          "relative flex size-9 items-center justify-center rounded-lg transition",
          active
            ? "bg-white/20 text-white"
            : "text-sidebar-muted group-hover:bg-sidebar-hover group-hover:text-white"
        )}
      >
        <Icon className="size-5" aria-hidden />
        {dot ? (
          <span
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-red-500"
            aria-label="Unread"
          />
        ) : null}
      </span>
      <span className={active ? "text-white" : "text-sidebar-muted"}>
        {label}
      </span>
    </button>
  );
}
