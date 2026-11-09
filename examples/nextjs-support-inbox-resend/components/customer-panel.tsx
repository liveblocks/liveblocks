"use client";

import { shallow, useOthers, useSelf } from "@liveblocks/react";
import { Building2Icon, MailIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  type Conversation,
} from "@/lib/conversation";
import { formatFullDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AgentAvatar, AgentName, CustomerAvatar } from "./avatars";
import { PriorityIcon } from "./status";

export function CustomerPanel({
  conversation,
  conversations,
  onClose,
  className,
}: {
  conversation: Conversation;
  // All conversations in the inbox, to show the customer's history.
  conversations: Conversation[];
  onClose: () => void;
  className?: string;
}) {
  const { metadata } = conversation;
  const history = conversations.filter(
    (item) => item.metadata.customerEmail === metadata.customerEmail
  );
  const openCount = history.filter(
    (item) => item.metadata.status === "open"
  ).length;

  return (
    <aside
      className={cn(
        "scroll-quiet flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-line bg-canvas",
        className
      )}
      aria-label="Details"
    >
      <div className="flex items-center justify-between px-5 pt-3.5 pb-2">
        <h2 className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
          Details
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 flex size-6 items-center justify-center rounded text-ink-faint hover:bg-hover hover:text-ink"
          aria-label="Close details"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      <section className="px-5 pb-5">
        <div className="flex items-center gap-3">
          <CustomerAvatar
            name={metadata.customerName}
            email={metadata.customerEmail}
            size="lg"
            className="size-10 text-sm"
          />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">
              {metadata.customerName}
            </div>
            <div className="truncate text-xs text-ink-muted">
              {metadata.customerCompany || "Customer"}
            </div>
          </div>
        </div>

        <dl className="mt-4 flex flex-col gap-2.5">
          <Row icon={<MailIcon className="size-3.5" />} label="Email">
            <a
              href={`mailto:${metadata.customerEmail}`}
              className="truncate text-ink hover:underline"
            >
              {metadata.customerEmail}
            </a>
          </Row>
          {metadata.customerCompany ? (
            <Row icon={<Building2Icon className="size-3.5" />} label="Company">
              {metadata.customerCompany}
            </Row>
          ) : null}
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat value={history.length} label="Conversations" />
          <Stat value={openCount} label="Open" />
        </div>
      </section>

      <Divider />

      <section className="px-5 py-5">
        <h3 className="mb-3 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
          Conversation
        </h3>
        <dl className="flex flex-col gap-2.5">
          <Field label="Status">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  metadata.status === "open" ? "bg-open" : "bg-ink-faint"
                )}
              />
              {metadata.status === "open" ? "Open" : "Resolved"}
            </span>
          </Field>
          <Field label="Priority">
            <span className="inline-flex items-center gap-1.5">
              <PriorityIcon priority={metadata.priority} className="size-3" />
              {PRIORITY_LABEL[metadata.priority]}
            </span>
          </Field>
          <Field label="Assignee">
            {metadata.assigneeId ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <AgentAvatar userId={metadata.assigneeId} size="xs" />
                <span className="truncate">
                  <AgentName userId={metadata.assigneeId} />
                </span>
              </span>
            ) : (
              <span className="text-ink-muted">Unassigned</span>
            )}
          </Field>
          {metadata.category ? (
            <Field label="Category">{CATEGORY_LABEL[metadata.category]}</Field>
          ) : null}
          <Field label="Created">{formatFullDate(conversation.createdAt)}</Field>
          <Field label="Last activity">
            {formatFullDate(
              Date.parse(metadata.lastActivityAt) || conversation.updatedAt
            )}
          </Field>
          <Field label="Source">
            {metadata.source === "resend" ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                Resend thread
                <code className="truncate rounded bg-hover px-1 font-mono text-[10px] text-ink-muted">
                  {metadata.resendThreadId}
                </code>
              </span>
            ) : (
              <span className="text-ink-muted">Sample conversation</span>
            )}
          </Field>
        </dl>
      </section>

      <Divider />

      <section className="px-5 py-5">
        <h3 className="mb-3 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
          Reading now
        </h3>
        <Viewers feedId={conversation.feedId} />
      </section>
    </aside>
  );
}

function Viewers({ feedId }: { feedId: string }) {
  const self = useSelf((me) => me?.id ?? null);
  const others = useOthers(
    (others) =>
      [
        ...new Set(
          others
            .filter((other) => other.presence.viewingFeedId === feedId)
            .map((other) => other.id)
        ),
      ].filter((id) => id !== self),
    shallow
  );
  const ids = self ? [self, ...others] : others;

  return (
    <ul className="flex flex-col gap-2">
      {ids.map((userId) => (
        <li key={userId} className="flex items-center gap-2 text-xs text-ink">
          <span className="relative">
            <AgentAvatar userId={userId} size="md" />
            <span className="absolute -right-px -bottom-px size-2 rounded-full bg-open ring-2 ring-canvas" />
          </span>
          <span className="truncate">
            <AgentName userId={userId} />
            {userId === self ? (
              <span className="text-ink-faint"> (you)</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <dt className="flex items-center text-ink-faint" title={label}>
        {icon}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-ink">{children}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{children}</dd>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <div className="tabular text-base font-semibold text-ink">{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="mx-5 h-px bg-line" />;
}
