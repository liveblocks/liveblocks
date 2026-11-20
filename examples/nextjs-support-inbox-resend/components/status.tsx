"use client";

import { useUser } from "@liveblocks/react";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleDashedIcon,
  UserRoundIcon,
} from "lucide-react";
import { getUsers } from "@/app/database";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUSES,
  type Priority,
  type Status,
} from "@/lib/conversation";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "./avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// Linear-style priority glyphs: three filled bars (1, 2 or 3 lit), and a
// filled rounded square with an exclamation mark for urgent. Solid shapes
// stay legible at 12px where stroked icons turn to mush.
export function PriorityIcon({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const base = cn("size-3.5 shrink-0", className);

  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" className={cn(base, "text-urgent")} aria-hidden>
        <rect x="1" y="1" width="14" height="14" rx="3.5" fill="currentColor" />
        <path
          d="M8 4.25v4.5"
          stroke="var(--color-surface)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11.5" r="1" fill="var(--color-surface)" />
      </svg>
    );
  }

  const lit = priority === "high" ? 3 : priority === "normal" ? 2 : 1;
  return (
    <svg viewBox="0 0 16 16" className={cn(base, "text-ink-secondary")} aria-hidden>
      {[
        { x: 1.5, y: 9, h: 5.5 },
        { x: 6.5, y: 5.5, h: 9 },
        { x: 11.5, y: 2, h: 12.5 },
      ].map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width="3"
          height={bar.h}
          rx="0.75"
          fill="currentColor"
          opacity={index < lit ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

// Linear-style status glyphs: a ring in the status color, with a fill that
// says how far along the conversation is. Orange needs the team, blue is
// waiting on something, green is finished, gray is set aside.
export function StatusIcon({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const base = cn("size-3.5 shrink-0", className);
  const ring = { cx: 8, cy: 8, r: 6.25, fill: "none", stroke: "currentColor", strokeWidth: 1.5 };

  switch (status) {
    case "needs-response":
      // Ring with a dot: new, nobody has picked it up.
      return (
        <svg viewBox="0 0 16 16" className={cn(base, "text-open")} aria-hidden>
          <circle {...ring} />
          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
        </svg>
      );
    case "investigating":
      // Half-filled ring: in progress.
      return (
        <svg viewBox="0 0 16 16" className={cn(base, "text-open")} aria-hidden>
          <circle {...ring} />
          <path d="M8 3.75a4.25 4.25 0 0 1 0 8.5z" fill="currentColor" />
        </svg>
      );
    case "waiting":
      // Dashed ring: on hold until the customer replies.
      return (
        <svg viewBox="0 0 16 16" className={cn(base, "text-waiting")} aria-hidden>
          <circle {...ring} strokeDasharray="2.6 2.3" strokeLinecap="round" />
        </svg>
      );
    case "paused":
      // Ring with pause bars.
      return (
        <svg viewBox="0 0 16 16" className={cn(base, "text-waiting")} aria-hidden>
          <circle {...ring} />
          <path
            d="M6.5 5.75v4.5M9.5 5.75v4.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ignored":
      // Filled gray disc with a cross.
      return (
        <svg viewBox="0 0 16 16" className={cn(base, "text-ink-faint")} aria-hidden>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"
            stroke="var(--color-surface)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "done":
      // Filled green disc with a check.
      return (
        <svg viewBox="0 0 16 16" className={cn(base, "text-done")} aria-hidden>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5 8.25l2 2 4-4.5"
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

/**
 * How a menu trigger looks:
 * - "outline": bordered button with icon + label (thread header)
 * - "icon": icon only, label in a tooltip (thread header)
 * - "ghost": plain text that gets a background on hover (details panel)
 */
export type MenuAppearance = "outline" | "icon" | "ghost";

export const triggerClass: Record<MenuAppearance, string> = {
  outline:
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink-secondary transition-colors hover:border-line-strong hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-hover data-[state=open]:text-ink",
  icon: "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/8 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-ink/8 data-[state=open]:text-ink",
  ghost:
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-1.5 text-left text-xs text-ink transition-colors hover:bg-ink/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-ink/8",
};

export function StatusMenu({
  value,
  onChange,
  appearance = "outline",
  className,
}: {
  value: Status;
  onChange: (status: Status) => void;
  appearance?: MenuAppearance;
  className?: string;
}) {
  const open = value === "needs-response";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          triggerClass[appearance],
          appearance === "outline" &&
            open &&
            "border-open/25 bg-open/8 text-open hover:border-open/40 hover:bg-open/12 hover:text-open",
          appearance === "ghost" && open && "font-medium text-open",
          className
        )}
        aria-label="Status"
      >
        <StatusIcon status={value} className="size-3" />
        <span className="truncate">{STATUS_LABEL[value]}</span>
        {appearance === "outline" ? (
          <ChevronDownIcon
            className={cn("size-3", open ? "text-open/60" : "text-ink-faint")}
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => onChange(status)}
            className="text-xs"
          >
            <StatusIcon status={status} />
            <span className="flex-1">{STATUS_LABEL[status]}</span>
            {status === value ? (
              <CheckIcon className="size-3.5 text-ink-muted" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PriorityMenu({
  value,
  onChange,
  appearance = "outline",
}: {
  value: Priority;
  onChange: (priority: Priority) => void;
  appearance?: MenuAppearance;
}) {
  const trigger = (
    <DropdownMenuTrigger
      className={triggerClass[appearance]}
      aria-label={`Priority: ${PRIORITY_LABEL[value]}`}
    >
      <PriorityIcon priority={value} className={appearance === "icon" ? "size-4" : undefined} />
      {appearance !== "icon" ? (
        <span className="truncate">{PRIORITY_LABEL[value]}</span>
      ) : null}
      {appearance === "outline" ? (
        <ChevronDownIcon className="size-3 text-ink-faint" />
      ) : null}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {appearance === "icon" ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            Priority: {PRIORITY_LABEL[value]}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent align="end" className="w-44">
        {PRIORITIES.map((priority) => (
          <DropdownMenuItem
            key={priority}
            onClick={() => onChange(priority)}
            className="text-xs"
          >
            <PriorityIcon priority={priority} />
            <span className="flex-1">{PRIORITY_LABEL[priority]}</span>
            {priority === value ? (
              <CheckIcon className="size-3.5 text-ink-muted" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneeMenu({
  value,
  selfId,
  onChange,
  appearance = "outline",
  className,
}: {
  value: string;
  selfId: string;
  onChange: (userId: string) => void;
  appearance?: MenuAppearance;
  className?: string;
}) {
  const agents = getUsers();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          triggerClass[appearance],
          appearance === "ghost" && !value && "text-ink-muted",
          className
        )}
        aria-label="Assignee"
      >
        {value ? (
          <>
            <AgentAvatar userId={value} size="xs" />
            <span className="truncate">
              <AssigneeLabel userId={value} selfId={selfId} />
            </span>
          </>
        ) : (
          <>
            <CircleDashedIcon className="size-3.5 text-ink-faint" />
            <span>Unassigned</span>
          </>
        )}
        {appearance === "outline" ? (
          <ChevronDownIcon className="size-3 text-ink-faint" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onChange(selfId)} className="text-xs">
          <UserRoundIcon className="size-3.5" />
          <span className="flex-1">Assign to me</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => onChange(agent.id)}
            className="text-xs"
          >
            <AgentAvatar userId={agent.id} size="sm" />
            <span className="flex-1 truncate">
              {agent.info.name}
              {agent.id === selfId ? (
                <span className="text-ink-faint"> (you)</span>
              ) : null}
            </span>
            {agent.id === value ? (
              <CheckIcon className="size-3.5 text-ink-muted" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange("")}
          className="text-xs"
          disabled={!value}
        >
          <CircleDashedIcon className="size-3.5" />
          <span className="flex-1">Unassign</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssigneeLabel({ userId, selfId }: { userId: string; selfId: string }) {
  const { user } = useUser(userId);
  if (userId === selfId) return <>You</>;
  return <>{user?.name ?? "…"}</>;
}
