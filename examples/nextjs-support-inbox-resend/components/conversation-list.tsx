"use client";

import {
  ArrowDownUpIcon,
  CheckIcon,
  ChevronDownIcon,
  InboxIcon,
  ListFilterIcon,
  MailIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  ticketRef,
  type Conversation,
} from "@/lib/conversation";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AgentAvatar, CustomerAvatar, ViewerAvatars } from "./avatars";
import { VIEWS, viewLabel, type View, type ViewCounts } from "./sidebar";
import { PriorityIcon, StatusIcon } from "./status";
import { TagList } from "./tags";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type ListFilter = "all" | "needs-response" | "waiting" | "priority";
export type ListSort = "newest" | "oldest" | "priority";

// Every view opens on what the team owes a reply to; Resolved shows everything
// it contains.
export function defaultFilter(view: View): ListFilter {
  return view === "resolved" ? "all" : "needs-response";
}

export function matchesFilter(
  metadata: Pick<Liveblocks["FeedMetadata"], "status" | "priority">,
  filter: ListFilter
) {
  switch (filter) {
    case "all":
      return true;
    case "needs-response":
    case "waiting":
      return metadata.status === filter;
    case "priority":
      return metadata.priority === "urgent" || metadata.priority === "high";
  }
}

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs-response", label: "Needs response" },
  { id: "waiting", label: "Waiting on customer" },
  { id: "priority", label: "High priority" },
];

const SORTS: { id: ListSort; label: string }[] = [
  { id: "newest", label: "Newest activity" },
  { id: "oldest", label: "Oldest activity" },
  { id: "priority", label: "Priority" },
];

export function ConversationList({
  view,
  counts,
  conversations,
  selectedId,
  query,
  filter,
  sort,
  isSeeding,
  inboxAddress,
  onSelect,
  onQueryChange,
  onFilterChange,
  onSortChange,
  onViewChange,
  className,
}: {
  view: View;
  counts: ViewCounts;
  conversations: Conversation[];
  selectedId: string | null;
  query: string;
  filter: ListFilter;
  sort: ListSort;
  isSeeding: boolean;
  // Address of the connected Resend inbox; null in demo mode.
  inboxAddress: string | null;
  onSelect: (feedId: string) => void;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ListFilter) => void;
  onSortChange: (sort: ListSort) => void;
  onViewChange: (view: View) => void;
  className?: string;
}) {
  // Relative times tick every minute.
  const now = useNow();

  return (
    <section
      className={cn(
        "flex w-full shrink-0 flex-col bg-surface md:card md:w-[340px] xl:w-[380px]",
        className
      )}
      aria-label="Conversations"
    >
      <header className="flex flex-col gap-2.5 border-b border-line px-4 pt-3.5 pb-3">
        <div className="flex h-7 items-center justify-between gap-2">
          {/* On small screens the sidebar is hidden, so the title doubles as
              a view switcher. */}
          <DropdownMenu>
            <DropdownMenuTrigger className="group -ml-1 flex items-center gap-1 rounded-md px-1 text-[15px] font-semibold text-ink md:pointer-events-none">
              {viewLabel(view)}
              <ChevronDownIcon className="size-3.5 text-ink-faint md:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 md:hidden">
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => onViewChange(id)}
                  className="text-[13px]"
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{label}</span>
                  <span className="tabular text-xs text-ink-faint">
                    {counts[id] || ""}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="tabular text-xs text-ink-muted">
            {conversations.length}{" "}
            {conversations.length === 1 ? "conversation" : "conversations"}
          </span>
        </div>

        <label className="group relative flex h-8 items-center">
          <SearchIcon className="pointer-events-none absolute left-2.5 size-3.5 text-ink-faint group-focus-within:text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search conversations"
            className="h-full w-full rounded-md border border-line bg-canvas pr-8 pl-8 text-[13px] text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong focus:border-line-strong focus:bg-surface focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-1.5 flex size-5 items-center justify-center rounded text-ink-faint hover:bg-hover hover:text-ink"
              aria-label="Clear search"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </label>

        <div className="flex items-center justify-between gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs text-ink-secondary transition-colors hover:bg-hover hover:text-ink data-[state=open]:bg-hover">
              <ListFilterIcon className="size-3.5 text-ink-muted" />
              {FILTERS.find((item) => item.id === filter)?.label}
              {filter !== defaultFilter(view) ? (
                <span className="size-1.5 rounded-full bg-ink" />
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {FILTERS.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onFilterChange(item.id)}
                  className="text-xs"
                >
                  <span className="flex-1">{item.label}</span>
                  {item.id === filter ? (
                    <CheckIcon className="size-3.5 text-ink-muted" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs text-ink-secondary transition-colors hover:bg-hover hover:text-ink data-[state=open]:bg-hover">
              <ArrowDownUpIcon className="size-3.5 text-ink-muted" />
              {SORTS.find((item) => item.id === sort)?.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SORTS.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onSortChange(item.id)}
                  className="text-xs"
                >
                  <span className="flex-1">{item.label}</span>
                  {item.id === sort ? (
                    <CheckIcon className="size-3.5 text-ink-muted" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <ListEmptyState
            view={view}
            filter={filter}
            query={query}
            isSeeding={isSeeding}
            inboxAddress={inboxAddress}
          />
        ) : (
          <ul role="list" className="flex flex-col">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.feedId}
                conversation={conversation}
                selected={conversation.feedId === selectedId}
                now={now}
                onSelect={() => onSelect(conversation.feedId)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ConversationRow({
  conversation,
  selected,
  now,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  now: number;
  onSelect: () => void;
}) {
  const { metadata, feedId } = conversation;
  const lastActivity = Date.parse(metadata.lastActivityAt) || conversation.updatedAt;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "group relative flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors",
          selected ? "bg-selected" : "hover:bg-hover"
        )}
      >
        {/* Selection bar */}
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-0.5 bg-ink transition-opacity",
            selected ? "opacity-100" : "opacity-0"
          )}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          {/* Customer + status */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CustomerAvatar
                name={metadata.customerName}
                email={metadata.customerEmail}
                size="sm"
              />
              <span className="truncate text-[13px] font-medium text-ink">
                {metadata.customerName}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex shrink-0 items-center">
                  <StatusIcon status={metadata.status} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={6}>
                {STATUS_LABEL[metadata.status]}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Reference + subject */}
          <div className="mt-1.5 flex min-w-0 items-baseline gap-2">
            <span className="tabular shrink-0 text-[13px] font-semibold text-ink-faint">
              {ticketRef(feedId)}
            </span>
            <span className="truncate text-[13px] font-semibold text-ink">
              {metadata.subject}
            </span>
          </div>

          <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-ink-muted">
            {metadata.preview}
          </p>

          <TagList tags={metadata.tags ?? []} className="mt-2" />

          {/* Priority · time · people */}
          <div className="mt-2 flex h-5 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-ink-secondary">
              <PriorityIcon priority={metadata.priority} className="size-3" />
              <span className="truncate">{PRIORITY_LABEL[metadata.priority]}</span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <ViewerAvatars feedId={feedId} size="xs" max={3} />
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
                <MailIcon className="size-3" />
                <time
                  className="tabular"
                  dateTime={new Date(lastActivity).toISOString()}
                  title={new Date(lastActivity).toLocaleString()}
                >
                  {formatRelative(lastActivity, now)}
                </time>
              </span>
              {metadata.assigneeId ? (
                <AgentAvatar userId={metadata.assigneeId} size="sm" />
              ) : null}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

function ListEmptyState({
  view,
  filter,
  query,
  isSeeding,
  inboxAddress,
}: {
  view: View;
  filter: ListFilter;
  query: string;
  isSeeding: boolean;
  inboxAddress: string | null;
}) {
  let title = "Nothing here";
  let description = "Conversations matching this view will show up here.";

  if (isSeeding) {
    title = "Setting up your inbox";
    description = "Loading conversations…";
  } else if (query) {
    title = "No results";
    description = `Nothing matches “${query}”.`;
  } else if (view === "inbox" && inboxAddress) {
    title = "Waiting for your first email";
    description = `Emails sent to ${inboxAddress} will appear here in realtime.`;
  } else if (view === "inbox" && filter === "needs-response") {
    title = "Inbox zero";
    description = "Nothing needs a response right now.";
  } else if (view === "inbox" && filter === "waiting") {
    title = "Nothing waiting on customers";
    description = "Conversations you've replied to will show up here.";
  } else if (view === "inbox" && filter === "priority") {
    title = "No high-priority conversations";
    description = "Urgent and high-priority conversations will show up here.";
  } else if (view === "inbox") {
    title = "Inbox zero";
    description = "New customer emails will appear here in realtime.";
  } else if (view === "mine") {
    title = "Nothing assigned to you";
    description = "Pick something up from Unassigned.";
  } else if (view === "unassigned") {
    title = "All conversations are assigned";
    description = "Nice. Nothing is waiting for an owner.";
  } else if (view === "mentions") {
    title = "No mentions";
    description = "You'll see conversations where a teammate @-mentions you.";
  } else if (view === "resolved") {
    title = "No resolved conversations yet";
    description = "Resolved conversations are kept here for reference.";
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-hover text-ink-muted">
        <InboxIcon className="size-4" strokeWidth={1.75} />
      </span>
      <h3 className="text-[13px] font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-ink-muted">
        {description}
      </p>
    </div>
  );
}

function useNow(interval = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}
