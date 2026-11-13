"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import {
  ArrowLeftIcon,
  CheckIcon,
  MailOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  RotateCcwIcon,
} from "lucide-react";
import type { Conversation, Priority, Status } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import { CustomerAvatar, ViewerAvatars } from "./avatars";
import { Composer } from "./composer";
import { MessageTimeline } from "./message-timeline";
import { TimelineSkeleton } from "./skeletons";
import { AssigneeMenu, PriorityMenu, StatusMenu } from "./status";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ConversationView({
  conversation,
  selfId,
  demoMode,
  detailsOpen,
  onToggleDetails,
  onBack,
  onSetStatus,
  onSetPriority,
  onSetAssignee,
  onSendReply,
  onAddNote,
  className,
}: {
  conversation: Conversation;
  selfId: string;
  demoMode: boolean;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onBack: () => void;
  onSetStatus: (status: Status) => void;
  onSetPriority: (priority: Priority) => void;
  onSetAssignee: (userId: string) => void;
  onSendReply: (text: string) => Promise<void>;
  onAddNote: (text: string) => Promise<void>;
  className?: string;
}) {
  const { metadata, feedId } = conversation;
  const resolved = metadata.status === "resolved";

  return (
    <section
      className={cn("flex min-w-0 flex-1 flex-col bg-surface md:card", className)}
      aria-label="Conversation"
    >
      <header className="shrink-0 border-b border-line">
        <div className="flex items-center gap-3 px-4 pt-3 md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeftIcon className="size-4" />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
            {metadata.subject}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            {/* Who's reading this thread right now (live, via presence). */}
            <ViewerAvatars feedId={feedId} size="md" includeSelf />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleDetails}
                  aria-pressed={detailsOpen}
                  className="hidden size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-hover hover:text-ink xl:flex"
                >
                  {detailsOpen ? (
                    <PanelRightCloseIcon className="size-4" strokeWidth={1.75} />
                  ) : (
                    <PanelRightOpenIcon className="size-4" strokeWidth={1.75} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {detailsOpen ? "Hide details" : "Show details"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-2 pb-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <CustomerAvatar
              name={metadata.customerName}
              email={metadata.customerEmail}
              size="sm"
            />
            <span className="truncate font-medium text-ink">
              {metadata.customerName}
            </span>
            <span className="hidden truncate text-ink-muted sm:inline">
              {metadata.customerEmail}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <StatusMenu value={metadata.status} onChange={onSetStatus} />
            <AssigneeMenu
              value={metadata.assigneeId}
              selfId={selfId}
              onChange={onSetAssignee}
            />
            <PriorityMenu value={metadata.priority} onChange={onSetPriority} />

            <button
              type="button"
              onClick={() =>
                onSetStatus(resolved ? "needs-response" : "resolved")
              }
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                resolved
                  ? "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:bg-hover hover:text-ink"
                  : "bg-ink text-surface hover:bg-ink/90"
              )}
            >
              {resolved ? (
                <RotateCcwIcon className="size-3.5" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
              {resolved ? "Reopen" : "Resolve"}
            </button>
          </div>
        </div>
      </header>

      {/* Suspense is scoped to the timeline so switching conversations only
          swaps the message area. */}
      <ClientSideSuspense fallback={<TimelineSkeleton />}>
        <MessageTimeline key={feedId} conversation={conversation} />
      </ClientSideSuspense>

      <Composer
        key={feedId}
        conversation={conversation}
        demoMode={demoMode || metadata.source === "demo"}
        onSendReply={onSendReply}
        onAddNote={onAddNote}
      />
    </section>
  );
}

export function NoConversation({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "card flex min-w-0 flex-1 flex-col items-center justify-center px-8 text-center",
        className
      )}
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-hover text-ink-muted">
        <MailOpenIcon className="size-4" strokeWidth={1.75} />
      </span>
      <h2 className="text-[13px] font-medium text-ink">Select a conversation</h2>
      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-ink-muted">
        Choose a conversation from the list to read it, reply to the customer,
        or leave a note for your team.
      </p>
    </section>
  );
}
