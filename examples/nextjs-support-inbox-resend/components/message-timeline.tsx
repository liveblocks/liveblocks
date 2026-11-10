"use client";

import { useFeedMessages } from "@liveblocks/react/suspense";
import {
  ChevronUpIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  SendIcon,
} from "lucide-react";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import {
  isEmail,
  isNote,
  sortByCreatedAt,
  type Conversation,
  type ConversationMessage,
  type EmailMessageData,
  type NoteMessageData,
} from "@/lib/conversation";
import { splitQuotedText } from "@/lib/email";
import {
  formatDay,
  formatFileSize,
  formatMessageTime,
  startOfDay,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { AgentAvatar, AgentName, CustomerAvatar } from "./avatars";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/**
 * The chronological email + note timeline of one conversation. Messages come
 * from the conversation's Liveblocks feed and update in realtime: emails
 * mirrored by the Resend webhook, replies being sent by teammates (visible
 * while they're still in flight), and notes.
 */
export function MessageTimeline({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { messages, hasFetchedAll, fetchMore, isFetchingMore } =
    useFeedMessages(conversation.feedId, { limit: 50 });
  const sorted = sortByCreatedAt(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastId = sorted[sorted.length - 1]?.id;

  // Start at the latest message, and follow new ones unless the reader has
  // scrolled up to read history.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node && stickToBottom.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [lastId]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    stickToBottom.current =
      node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="scroll-quiet min-h-0 flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex w-full max-w-[760px] flex-col px-6 pt-4 pb-6 md:px-10">
        {!hasFetchedAll ? (
          <button
            type="button"
            onClick={fetchMore}
            disabled={isFetchingMore}
            className="mx-auto mb-4 inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs text-ink-secondary hover:bg-hover disabled:opacity-60"
          >
            <ChevronUpIcon className="size-3.5" />
            {isFetchingMore ? "Loading…" : "Load earlier messages"}
          </button>
        ) : null}

        {sorted.length === 0 ? (
          <div className="py-24 text-center text-[13px] text-ink-muted">
            No messages yet.
          </div>
        ) : (
          sorted.map((message, index) => {
            const previous = sorted[index - 1];
            const newDay =
              !previous ||
              startOfDay(previous.createdAt) !== startOfDay(message.createdAt);
            return (
              <Fragment key={message.id}>
                {newDay ? <DaySeparator timestamp={message.createdAt} /> : null}
                <TimelineItem message={message} conversation={conversation} />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

function DaySeparator({ timestamp }: { timestamp: number }) {
  return (
    <div className="my-5 flex items-center gap-3 first:mt-0" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
        {formatDay(timestamp)}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function TimelineItem({
  message,
  conversation,
}: {
  message: ConversationMessage;
  conversation: Conversation;
}) {
  if (isNote(message)) {
    return <NoteMessage message={message} />;
  }
  if (isEmail(message)) {
    return <EmailMessage message={message} conversation={conversation} />;
  }
  return null;
}

function EmailMessage({
  message,
  conversation,
}: {
  message: { id: string; createdAt: number; data: EmailMessageData };
  conversation: Conversation;
}) {
  const { data } = message;
  const outbound = data.direction === "outbound";
  const sending = outbound && data.status === "sending";
  const { body, quoted } = splitQuotedText(data.text);
  const [showQuoted, setShowQuoted] = useState(false);

  return (
    <article
      className={cn(
        "group/message relative mb-3 rounded-lg border p-4 transition-colors",
        outbound
          ? "border-line bg-canvas"
          : "border-transparent bg-surface hover:border-line",
        sending && "opacity-60"
      )}
      aria-label={`${outbound ? "Outgoing" : "Incoming"} email from ${data.from.name}`}
      aria-busy={sending || undefined}
    >
      <header className="flex items-start gap-3">
        {outbound && data.authorId ? (
          <AgentAvatar userId={data.authorId} size="lg" />
        ) : (
          <CustomerAvatar
            name={data.from.name}
            email={data.from.email}
            size="lg"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[13px] font-semibold text-ink">
                {outbound && data.authorId ? (
                  <AgentName userId={data.authorId} />
                ) : (
                  data.from.name
                )}
              </span>
              <span className="truncate text-xs text-ink-muted">
                {data.from.email}
              </span>
            </div>
            <time
              className="tabular shrink-0 text-[11px] text-ink-faint"
              dateTime={new Date(message.createdAt).toISOString()}
              title={new Date(message.createdAt).toLocaleString()}
            >
              {formatMessageTime(message.createdAt)}
            </time>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
            {sending ? (
              <span
                className="inline-flex items-center gap-1 text-ink-secondary"
                role="status"
              >
                <Loader2Icon className="size-3 animate-spin" />
                Sending to{" "}
                {data.to.join(", ") || conversation.metadata.customerEmail}…
              </span>
            ) : outbound ? (
              <span className="inline-flex items-center gap-1 text-ink-secondary">
                <SendIcon className="size-3" />
                Sent to {data.to.join(", ") || conversation.metadata.customerEmail}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <MailIcon className="size-3" />
                To {data.to.join(", ") || "support"}
              </span>
            )}
            {data.cc.length > 0 ? <span>· Cc {data.cc.join(", ")}</span> : null}
            {data.simulated && outbound && !sending ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default items-center rounded-sm border border-dashed border-line-strong px-1.5 py-px text-[10px] font-medium tracking-wide text-ink-muted uppercase">
                    Simulated
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Demo data — this email was not actually delivered.
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </header>

      <div className="prose-email mt-3 whitespace-pre-wrap md:pl-12">
        {renderParagraphs(body)}
        {quoted ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowQuoted((value) => !value)}
              className="inline-flex h-5 items-center rounded-sm bg-hover px-2 text-[11px] tracking-[0.2em] text-ink-muted hover:bg-selected hover:text-ink"
              aria-expanded={showQuoted}
              aria-label={showQuoted ? "Hide quoted text" : "Show quoted text"}
            >
              •••
            </button>
            {showQuoted ? (
              <div className="mt-2 border-l-2 border-line pl-3 text-[13px] text-ink-muted">
                {renderParagraphs(quoted)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {data.attachments.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2 md:pl-12" aria-label="Attachments">
          {data.attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-xs text-ink-secondary"
            >
              <AttachmentIcon filename={attachment.filename} />
              <span className="truncate font-medium text-ink">
                {attachment.filename}
              </span>
              {attachment.size !== null ? (
                <span className="tabular text-ink-faint">
                  {formatFileSize(attachment.size)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function NoteMessage({
  message,
}: {
  message: { id: string; createdAt: number; data: NoteMessageData };
}) {
  const { data } = message;

  return (
    <article
      className="relative mb-3 rounded-lg border border-note-line bg-note p-4"
      aria-label="Internal note"
    >
      <header className="flex items-start gap-3">
        <AgentAvatar userId={data.authorId} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[13px] font-semibold text-ink">
                <AgentName userId={data.authorId} />
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-note-ink">
                <LockIcon className="size-3" />
                Internal note
              </span>
            </div>
            <time
              className="tabular shrink-0 text-[11px] text-ink-faint"
              dateTime={new Date(message.createdAt).toISOString()}
              title={new Date(message.createdAt).toLocaleString()}
            >
              {formatMessageTime(message.createdAt)}
            </time>
          </div>
        </div>
      </header>
      <div className="prose-email mt-2.5 whitespace-pre-wrap md:pl-12">
        {renderParagraphs(data.text, true)}
      </div>
    </article>
  );
}

// Plain text → paragraphs; optionally highlights "@Full Name" mentions.
function renderParagraphs(text: string, highlightMentions = false) {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  return paragraphs.map((paragraph, index) => (
    <p key={index}>
      {highlightMentions ? highlight(paragraph) : paragraph}
    </p>
  ));
}

const MENTION_PATTERN = /@([A-Z][\p{L}'-]+(?:\s[A-Z][\p{L}'-]+)?)/gu;

function highlight(text: string) {
  const parts: (string | { mention: string })[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push({ mention: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((part, index) =>
    typeof part === "string" ? (
      part
    ) : (
      <span
        key={index}
        className="rounded-sm bg-note-line/70 px-1 font-medium text-note-ink"
      >
        {part.mention}
      </span>
    )
  );
}

function AttachmentIcon({ filename }: { filename: string }) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const className = "size-3.5 shrink-0 text-ink-muted";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(extension)) {
    return <ImageIcon className={className} />;
  }
  if (["csv", "xls", "xlsx"].includes(extension)) {
    return <FileSpreadsheetIcon className={className} />;
  }
  if (["pdf", "txt", "doc", "docx", "md", "log"].includes(extension)) {
    return <FileTextIcon className={className} />;
  }
  return <FileIcon className={className} />;
}