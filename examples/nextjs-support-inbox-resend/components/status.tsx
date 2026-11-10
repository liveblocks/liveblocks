"use client";

import { useUser } from "@liveblocks/react";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleDashedIcon,
  CircleDotIcon,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
  TriangleAlertIcon,
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

export function PriorityIcon({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const base = cn("size-3.5 shrink-0", className);
  switch (priority) {
    case "urgent":
      return <TriangleAlertIcon className={cn(base, "text-urgent")} />;
    case "high":
      return <SignalHighIcon className={cn(base, "text-high")} />;
    case "normal":
      return <SignalMediumIcon className={cn(base, "text-ink-faint")} />;
    case "low":
      return <SignalLowIcon className={cn(base, "text-ink-faint")} />;
  }
}

// Compact indicator for list rows: only priorities that deserve attention
// get a mark, so the list stays quiet.
export function PriorityMark({ priority }: { priority: Priority }) {
  if (priority === "urgent") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-sm bg-urgent/10 px-1.5 py-px text-[10px] font-medium tracking-wide text-urgent uppercase"
        title="Urgent"
      >
        Urgent
      </span>
    );
  }
  if (priority === "high") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-sm bg-high/10 px-1.5 py-px text-[10px] font-medium tracking-wide text-high uppercase"
        title="High priority"
      >
        High
      </span>
    );
  }
  return null;
}

export function StatusIcon({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const base = cn("size-3.5 shrink-0", className);
  switch (status) {
    case "needs-response":
      return <CircleDotIcon className={cn(base, "text-open")} />;
    case "waiting":
      return <CircleDashedIcon className={cn(base, "text-ink-muted")} />;
    case "resolved":
      return <CheckIcon className={cn(base, "text-ink-muted")} />;
  }
}

// Inline status for list rows and the details panel: a colored dot only for
// conversations the team still owes a reply, so the list stays quiet.
export function StatusText({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status === "needs-response" ? "bg-open" : "bg-ink-faint"
        )}
        aria-hidden
      />
      <span
        className={cn(
          status === "needs-response" && "font-medium text-open"
        )}
      >
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}

export function StatusMenu({
  value,
  onChange,
}: {
  value: Status;
  onChange: (status: Status) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          triggerClass,
          value === "needs-response" &&
            "border-open/25 bg-open/8 text-open hover:border-open/40 hover:bg-open/12 hover:text-open"
        )}
        aria-label="Status"
      >
        <StatusIcon status={value} className="size-3" />
        <span>{STATUS_LABEL[value]}</span>
        <ChevronDownIcon
          className={cn(
            "size-3",
            value === "needs-response" ? "text-open/60" : "text-ink-faint"
          )}
        />
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

const triggerClass =
  "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink-secondary transition-colors hover:border-line-strong hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-hover data-[state=open]:text-ink";

export function PriorityMenu({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (priority: Priority) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label="Priority">
        <PriorityIcon priority={value} />
        <span>{PRIORITY_LABEL[value]}</span>
        <ChevronDownIcon className="size-3 text-ink-faint" />
      </DropdownMenuTrigger>
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
}: {
  value: string;
  selfId: string;
  onChange: (userId: string) => void;
}) {
  const agents = getUsers();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label="Assignee">
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
        <ChevronDownIcon className="size-3 text-ink-faint" />
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
