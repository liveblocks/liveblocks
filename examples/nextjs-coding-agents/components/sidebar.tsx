"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SquarePenIcon,
} from "lucide-react";
import Link from "next/link";
import { ChatList } from "@/components/chat-list";
import { NotificationsButton } from "@/components/notifications";
import { UserMenu } from "@/components/user-menu";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={clsx(
        "flex shrink-0 flex-col border-r border-border bg-panel transition-[width] duration-200",
        collapsed ? "w-12" : "w-[272px]"
      )}
    >
      <header
        className={clsx(
          "flex h-12 shrink-0 items-center gap-1 px-1.5",
          collapsed ? "flex-col justify-start gap-1 py-1.5 h-auto" : "flex-row"
        )}
      >
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </IconButton>

        {!collapsed ? (
          <span className="min-w-0 flex-1 truncate px-1 text-[13px] font-semibold text-foreground">
            Agents
          </span>
        ) : null}

        <ClientSideSuspense fallback={null}>
          <NotificationsButton collapsed={collapsed} />
        </ClientSideSuspense>

        <Link
          href="/"
          aria-label="New chat"
          title="New chat"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground"
        >
          <SquarePenIcon className="size-4" />
        </Link>
      </header>

      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <ClientSideSuspense fallback={null}>
            <ChatList />
          </ClientSideSuspense>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <footer className="shrink-0 border-t border-border p-1.5">
        <UserMenu collapsed={collapsed} />
      </footer>
    </aside>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
