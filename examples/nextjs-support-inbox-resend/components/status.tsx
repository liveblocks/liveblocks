"use client";

import { useUser } from "@liveblocks/react";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleUserRoundIcon,
  type LucideProps,
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
/** "Unassigned" glyph: a person in a circle. */
export function UnassignedIcon(props: LucideProps) {
  return <CircleUserRoundIcon {...props} />;
}

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

// Linear-style status glyphs: a thin ring in the status color with a small
// glyph inside. Orange needs the team, blue is waiting on something, green is
// finished, gray is set aside.
const STATUS_TONE: Record<Status, string> = {
  "needs-response": "text-open",
  investigating: "text-open",
  waiting: "text-waiting",
  paused: "text-waiting",
  ignored: "text-ink-faint",
  done: "text-done",
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function StatusGlyph({ status }: { status: Status }) {
  switch (status) {
    case "needs-response":
      return (
        <>
          <path d="M8 4.5v4" {...STROKE} strokeWidth={1.75} />
          <circle cx="8" cy="11.25" r="0.9" fill="currentColor" />
        </>
      );
    case "investigating":
      return (
        <>
          <circle cx="5.25" cy="8" r="0.9" fill="currentColor" />
          <circle cx="8" cy="8" r="0.9" fill="currentColor" />
          <circle cx="10.75" cy="8" r="0.9" fill="currentColor" />
        </>
      );
    case "waiting":
      return <path d="M8 5v3.25l2 1.5" {...STROKE} />;
    case "paused":
      return <path d="M6.5 5.75v4.5M9.5 5.75v4.5" {...STROKE} strokeWidth={1.75} />;
    case "ignored":
      return <path d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" {...STROKE} />;
    case "done":
      return <path d="M5 8.25l2 2 4-4.5" {...STROKE} />;
  }
}

export function StatusIcon({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0", STATUS_TONE[status], className)}
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" {...STROKE} strokeLinecap="butt" />
      <StatusGlyph status={status} />
    </svg>
  );
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
    "inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink-secondary transition-colors hover:border-line-strong hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-hover data-[state=open]:text-ink",
  icon: "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/8 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-ink/8 data-[state=open]:text-ink",
  ghost:
    "inline-flex h-7 max-w-full items-center gap-1 rounded-md px-1.5 text-left text-xs text-ink transition-colors hover:bg-ink/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-ink/8",
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(triggerClass[appearance], className)}
        aria-label="Status"
      >
        <StatusIcon status={value} />
        <span className="truncate">{STATUS_LABEL[value]}</span>
        {appearance === "outline" ? (
          <ChevronDownIcon className="size-3 text-ink-faint" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => onChange(status)}
          >
            <StatusIcon status={status} />
            <span className="flex-1">{STATUS_LABEL[status]}</span>
            {status === value ? (
              <CheckIcon className="size-4 text-ink" />
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
      <DropdownMenuContent align="end" className="min-w-40">
        {PRIORITIES.map((priority) => (
          <DropdownMenuItem
            key={priority}
            onClick={() => onChange(priority)}
          >
            <PriorityIcon priority={priority} />
            <span className="flex-1">{PRIORITY_LABEL[priority]}</span>
            {priority === value ? (
              <CheckIcon className="size-4 text-ink" />
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
  const self = agents.find((agent) => agent.id === selfId);
  const others = agents.filter((agent) => agent.id !== selfId);

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
            <UnassignedIcon className="size-3.5 text-ink-faint" />
            <span>Unassigned</span>
          </>
        )}
        {appearance === "outline" ? (
          <ChevronDownIcon className="size-3 text-ink-faint" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {/* Unassign and yourself first, then the rest of the team. */}
        <DropdownMenuItem
          onClick={() => onChange("")}
        >
          <UnassignedIcon className="size-5 text-ink-faint" strokeWidth={1.5} />
          <span className="flex-1">Unassign</span>
          {!value ? <CheckIcon className="size-4 text-ink" /> : null}
        </DropdownMenuItem>
        {self ? (
          <AgentItem agent={self} selected={value === self.id} onPick={onChange} isSelf />
        ) : null}
        <DropdownMenuSeparator />
        {others.map((agent) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            selected={value === agent.id}
            onPick={onChange}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgentItem({
  agent,
  selected,
  isSelf = false,
  onPick,
}: {
  agent: ReturnType<typeof getUsers>[number];
  selected: boolean;
  isSelf?: boolean;
  onPick: (userId: string) => void;
}) {
  return (
    <DropdownMenuItem
      onClick={() => onPick(agent.id)}
    >
      <AgentAvatar userId={agent.id} size="sm" />
      <span className="flex-1 truncate">
        {agent.info.name}
        {isSelf ? <span className="text-ink-faint"> (Me)</span> : null}
      </span>
      {selected ? <CheckIcon className="size-4 text-ink" /> : null}
    </DropdownMenuItem>
  );
}

function AssigneeLabel({ userId, selfId }: { userId: string; selfId: string }) {
  const { user } = useUser(userId);
  if (userId === selfId) return <>You</>;
  return <>{user?.name ?? "…"}</>;
}
