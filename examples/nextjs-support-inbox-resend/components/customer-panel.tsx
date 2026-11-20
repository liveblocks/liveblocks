"use client";

import { Building2Icon, MailIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  type Conversation,
  type Customer,
  type Priority,
  type Status,
} from "@/lib/conversation";
import { formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CustomerAvatar } from "./avatars";
import { AssigneeMenu, PriorityMenu, StatusMenu } from "./status";
import { TagsMenu } from "./tags";

export function CustomerPanel({
  conversation,
  selfId,
  knownTags,
  onSetStatus,
  onSetPriority,
  onSetAssignee,
  onSetTags,
  onViewCustomer,
  onClose,
  wide = false,
  className,
}: {
  conversation: Conversation;
  selfId: string;
  knownTags: string[];
  onSetStatus: (status: Status) => void;
  onSetPriority: (priority: Priority) => void;
  onSetAssignee: (userId: string) => void;
  onSetTags: (tags: string[]) => void;
  onViewCustomer: (customer: Customer) => void;
  onClose: () => void;
  // Roomier side gutters, for the slide-over on small screens.
  wide?: boolean;
  className?: string;
}) {
  const gutter = wide ? "px-5" : "px-3";
  const { metadata } = conversation;
  const customer: Customer = {
    name: metadata.customerName,
    email: metadata.customerEmail,
  };

  return (
    <aside
      className={cn(
        "scroll-quiet flex w-[320px] shrink-0 flex-col overflow-y-auto",
        className
      )}
      aria-label="Details"
    >
      <section className={cn(gutter, "pt-3 pb-5")}>
        <div className="flex items-center gap-3">
          <CustomerAvatar
            name={metadata.customerName}
            email={metadata.customerEmail}
            size="lg"
            className="size-10 text-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">
              {metadata.customerName}
            </div>
            <div className="truncate text-xs text-ink-muted">
              {metadata.customerCompany || "Customer"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 flex size-6 shrink-0 items-center justify-center self-start rounded text-ink-faint hover:bg-ink/8 hover:text-ink"
            aria-label="Close details"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        <dl className="mt-4 flex flex-col gap-2.5">
          <Row icon={<MailIcon className="size-3.5" />} label="Email">
            <button
              type="button"
              onClick={() => onViewCustomer(customer)}
              className="-mx-1 max-w-full truncate rounded px-1 text-ink hover:bg-ink/8"
              title="Show all conversations from this customer"
            >
              {metadata.customerEmail}
            </button>
          </Row>
          {metadata.customerCompany ? (
            <Row icon={<Building2Icon className="size-3.5" />} label="Company">
              {metadata.customerCompany}
            </Row>
          ) : null}
        </dl>
      </section>

      <div className={cn(wide ? "mx-5" : "mx-3", "h-px bg-line")} />

      <section className={cn(gutter, "py-5")}>
        <h3 className="mb-3 text-xs font-medium text-ink">
          Thread
        </h3>
        {/* Two left-aligned columns: label, value. Editable values look like
            text until hovered, then open the same menus as the header. */}
        <dl className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-xs">
          <Field label="Status" editable>
            <StatusMenu
              value={metadata.status}
              onChange={onSetStatus}
              appearance="ghost"
            />
          </Field>
          <Field label="Priority" editable>
            <PriorityMenu
              value={metadata.priority}
              onChange={onSetPriority}
              appearance="ghost"
            />
          </Field>
          <Field label="Assignee" editable>
            <AssigneeMenu
              value={metadata.assigneeId}
              selfId={selfId}
              onChange={onSetAssignee}
              appearance="ghost"
            />
          </Field>
          <Field label="Tags" align="start" editable>
            <TagsMenu
              value={metadata.tags ?? []}
              knownTags={knownTags}
              onChange={onSetTags}
              appearance="ghost"
            />
          </Field>
          <Field label="Created">
            {formatMessageTime(conversation.createdAt)}
          </Field>
          <Field label="Last activity">
            {formatMessageTime(
              Date.parse(metadata.lastActivityAt) || conversation.updatedAt
            )}
          </Field>
        </dl>
      </section>
    </aside>
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

function Field({
  label,
  align = "center",
  editable = false,
  children,
}: {
  label: string;
  // "start" for values that wrap over several lines (tags).
  align?: "center" | "start";
  // Editable values are menu triggers with their own padding; pull them
  // left so their text lines up with the plain values.
  editable?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <dt
        className={cn(
          "flex h-7 items-center text-ink-muted",
          align === "start" && "self-start"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "flex min-h-7 min-w-0 items-center text-ink",
          editable && "-ml-1.5"
        )}
      >
        {children}
      </dd>
    </>
  );
}

