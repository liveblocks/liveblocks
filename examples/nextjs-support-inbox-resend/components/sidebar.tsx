"use client";

import { useSelf } from "@liveblocks/react/suspense";
import {
  AtSignIcon,
  CheckCircle2Icon,
  ChevronsUpDownIcon,
  CircleDashedIcon,
  InboxIcon,
  SettingsIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "./avatars";
import { HelpButton } from "./help-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type View =
  | "inbox"
  | "mine"
  | "unassigned"
  | "mentions"
  | "resolved"
  | "settings";

export type ViewCounts = Record<Exclude<View, "settings">, number>;

export const VIEWS: { id: Exclude<View, "settings">; label: string; icon: LucideIcon }[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "mine", label: "Mine", icon: UserRoundIcon },
  { id: "unassigned", label: "Unassigned", icon: CircleDashedIcon },
  { id: "mentions", label: "Mentions", icon: AtSignIcon },
  { id: "resolved", label: "Resolved", icon: CheckCircle2Icon },
];

export function viewLabel(view: View) {
  return view === "settings"
    ? "Settings"
    : (VIEWS.find((item) => item.id === view)?.label ?? "Inbox");
}

export function Sidebar({
  view,
  counts,
  inboxAddress,
  onChange,
  className,
}: {
  view: View;
  counts: ViewCounts;
  inboxAddress: string | null;
  onChange: (view: View) => void;
  className?: string;
}) {
  const self = useSelf();

  return (
    <aside
      className={cn(
        "flex w-[220px] shrink-0 flex-col border-r border-line bg-canvas",
        className
      )}
    >
      <div className="px-3 pt-3 pb-2">
        <WorkspaceSwitcher inboxAddress={inboxAddress} />
      </div>

      <nav className="flex flex-col gap-px px-2" aria-label="Views">
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          const count = counts[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                active
                  ? "bg-selected font-medium text-ink"
                  : "text-ink-secondary hover:bg-hover hover:text-ink"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-ink" : "text-ink-muted group-hover:text-ink-secondary"
                )}
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate text-left">{label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "tabular text-xs",
                    active ? "text-ink-secondary" : "text-ink-faint"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-3 border-t border-line px-2 pt-3">
        <button
          type="button"
          onClick={() => onChange("settings")}
          aria-current={view === "settings" ? "page" : undefined}
          className={cn(
            "group flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
            view === "settings"
              ? "bg-selected font-medium text-ink"
              : "text-ink-secondary hover:bg-hover hover:text-ink"
          )}
        >
          <SettingsIcon
            className={cn(
              "size-4 shrink-0",
              view === "settings"
                ? "text-ink"
                : "text-ink-muted group-hover:text-ink-secondary"
            )}
            strokeWidth={1.75}
          />
          Settings
        </button>
      </div>

      <div className="mt-auto flex items-center gap-2.5 border-t border-line px-3 py-3">
        <AgentAvatar userId={self.id} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">
            {self.info.name}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {self.info.title}
          </div>
        </div>
        <HelpButton />
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({ inboxAddress }: { inboxAddress: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex h-10 w-full items-center gap-2.5 rounded-md px-1.5 text-left transition-colors hover:bg-hover data-[state=open]:bg-hover">
        <RelayMark />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] leading-tight font-semibold text-ink">
            Relay
          </div>
          <div className="truncate text-[11px] leading-tight text-ink-muted">
            {inboxAddress ?? "support@relay.example"}
          </div>
        </div>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-ink-faint group-hover:text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuItem className="text-[13px]">
          <RelayMark small />
          <div className="min-w-0 flex-1">
            <div className="truncate">Relay</div>
            <div className="truncate text-[11px] text-ink-muted">
              {inboxAddress ?? "support@relay.example"}
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-[13px]">
          Create workspace…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RelayMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-ink text-surface",
        small ? "size-5" : "size-7"
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 16 16"
        className={small ? "size-3" : "size-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12.5V3.5h5.5a2.75 2.75 0 0 1 0 5.5H3" />
        <path d="M8.5 9l4 3.5" />
      </svg>
    </span>
  );
}
