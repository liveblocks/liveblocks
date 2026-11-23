"use client";

import { useSelf } from "@liveblocks/react/suspense";
import {
  AtSignIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  CircleDotIcon,
  SettingsIcon,
  UserRoundIcon,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { WORKSPACES, type Workspace, type WorkspaceId } from "@/lib/workspaces";
import { AgentAvatar } from "./avatars";
import { HelpButton } from "./help-button";
import { UnassignedIcon } from "./status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type View =
  | "open"
  | "mine"
  | "unassigned"
  | "mentions"
  | "done"
  | "settings";

export type ViewCounts = Record<Exclude<View, "settings">, number>;

export const VIEWS: {
  id: Exclude<View, "settings">;
  label: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { id: "open", label: "Open", icon: CircleDotIcon },
  { id: "mine", label: "Mine", icon: UserRoundIcon },
  { id: "unassigned", label: "Unassigned", icon: UnassignedIcon },
  { id: "mentions", label: "Mentions", icon: AtSignIcon },
  { id: "done", label: "Done", icon: CheckCircle2Icon },
];

export function viewLabel(view: View) {
  return view === "settings"
    ? "Settings"
    : (VIEWS.find((item) => item.id === view)?.label ?? "Inbox");
}

export function Sidebar({
  view,
  counts,
  workspace,
  inboxAddress,
  onChange,
  onWorkspaceChange,
  className,
}: {
  // null while the list is scoped to a customer (no view is active).
  view: View | null;
  counts: ViewCounts;
  workspace: Workspace;
  inboxAddress: string;
  onChange: (view: View) => void;
  onWorkspaceChange: (workspaceId: WorkspaceId) => void;
  className?: string;
}) {
  const self = useSelf();

  return (
    <aside
      className={cn(
        // Icon rail on narrow screens, full navigation from `lg` up.
        "flex w-8 shrink-0 flex-col lg:w-[220px]",
        className
      )}
    >
      <div className="pt-px pb-2 lg:px-2 lg:pt-3">
        <WorkspaceSwitcher
          workspace={workspace}
          inboxAddress={inboxAddress}
          onChange={onWorkspaceChange}
        />
      </div>

      <nav className="flex flex-col gap-px lg:px-2" aria-label="Views">
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          const count = counts[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "group flex h-8 items-center justify-center gap-2.5 rounded-md px-0 text-[13px] transition-colors lg:justify-start lg:px-2",
                active
                  ? "bg-selected font-semibold text-ink"
                  : "text-ink-secondary hover:bg-ink/8 hover:text-ink"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-ink" : "text-ink-muted group-hover:text-ink-secondary"
                )}
                strokeWidth={1.75}
              />
              <span className="hidden flex-1 truncate text-left lg:block">
                {label}
              </span>
              {count > 0 ? (
                <span
                  className={cn(
                    "tabular hidden text-xs lg:block",
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

      <div className="mt-3 border-t border-line pt-3 lg:px-2">
        <button
          type="button"
          onClick={() => onChange("settings")}
          aria-current={view === "settings" ? "page" : undefined}
          title="Settings"
          className={cn(
            "group flex h-8 w-full items-center justify-center gap-2.5 rounded-md px-0 text-[13px] transition-colors lg:justify-start lg:px-2",
            view === "settings"
              ? "bg-selected font-semibold text-ink"
              : "text-ink-secondary hover:bg-ink/8 hover:text-ink"
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
          <span className="hidden lg:inline">Settings</span>
        </button>
      </div>

      <div className="mt-auto flex items-center justify-center gap-2.5 border-t border-line py-3 lg:justify-start lg:px-3">
        <span title={self.info.name}>
          <AgentAvatar userId={self.id} size="lg" ring="ring-canvas" />
        </span>
        <div className="hidden min-w-0 flex-1 lg:block">
          <div className="truncate text-[13px] font-medium text-ink">
            {self.info.name}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {self.info.title}
          </div>
        </div>
        <span className="hidden lg:contents">
          <HelpButton />
        </span>
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({
  workspace,
  inboxAddress,
  onChange,
}: {
  workspace: Workspace;
  inboxAddress: string;
  onChange: (workspaceId: WorkspaceId) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex h-7 w-full items-center justify-center gap-2.5 rounded-md text-left transition-colors hover:bg-ink/8 data-[state=open]:bg-ink/8 lg:h-10 lg:justify-start lg:px-2"
        aria-label={`Workspace: ${workspace.name}`}
        title={workspace.name}
      >
        <LiveblocksMark />
        <div className="hidden min-w-0 flex-1 lg:block">
          <div className="truncate text-[13px] leading-tight font-medium text-ink">
            {workspace.name}
          </div>
          <div className="truncate text-[11px] leading-tight text-ink-muted">
            {inboxAddress}
          </div>
        </div>
        <ChevronsUpDownIcon className="hidden size-3.5 shrink-0 text-ink-faint group-hover:text-ink-muted lg:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {WORKSPACES.map((item) => {
          const active = item.id === workspace.id;
          return (
            <DropdownMenuItem
              key={item.id}
              className="h-auto py-1.5 text-[13px]"
              onClick={() => onChange(item.id)}
              aria-current={active ? "true" : undefined}
            >
              <LiveblocksMark small />
              <div className="min-w-0 flex-1">
                <div className="truncate">{item.name}</div>
                <div className="truncate text-[11px] text-ink-muted">
                  {active ? inboxAddress : item.address}
                </div>
              </div>
              {active ? (
                <CheckIcon className="size-3.5 shrink-0 text-ink" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LiveblocksMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-ink text-surface",
        small ? "size-5" : "size-7"
      )}
      aria-hidden
    >
      {/* Explicit size/color so the menu's generic svg styles don't apply. */}
      <svg
        viewBox="768 320 264 160"
        fill="currentColor"
        className={cn("text-surface", small ? "size-3.5" : "size-5")}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M954 320H768L821 376V453L954 320ZM847 480H1032L979 424V347L847 480Z"
        />
      </svg>
    </span>
  );
}
